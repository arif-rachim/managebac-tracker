// ManageBac deadline tracker.
//
// Logs in, pulls the calendar feed for a rolling window, merges it into a local
// JSON store (deduped by task id, remembering when each was first/last seen),
// and prints the upcoming deadlines with a "days left" countdown.
//
// Usage:
//   MB_LOGIN=... MB_PASSWORD=... MB_SUBDOMAIN=diadubai \
//   NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
//   node scripts/track.mjs [--days 60] [--start ISO --end ISO] [--all]
//
// Flags:
//   --days N       look-ahead window in days (default 60)
//   --start ISO    explicit window start (overrides --days)
//   --end ISO      explicit window end
//   --all          list every stored deadline, not just upcoming ones
//   --json         print the upcoming list as JSON instead of a table
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { login, fetchDeadlines, fetchTaskDetail } from './lib/managebac.mjs';

const STORE = 'data/store.json';

function parseArgs(argv) {
  const a = { days: 60 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--days') a.days = Number(argv[++i]);
    else if (k === '--start') a.start = argv[++i];
    else if (k === '--end') a.end = argv[++i];
    else if (k === '--all') a.all = true;
    else if (k === '--json') a.json = true;
    else if (k === '--enrich') a.enrich = true;
  }
  return a;
}

function loadStore() {
  if (!existsSync(STORE)) return { tasks: {}, syncedAt: null };
  try {
    return JSON.parse(readFileSync(STORE, 'utf8'));
  } catch {
    return { tasks: {}, syncedAt: null };
  }
}

// merge freshly-fetched deadlines into the store, preserving first_seen and
// flagging anything that vanished from the feed (likely removed/rescheduled).
function merge(store, fetched, nowIso, windowStart, windowEnd) {
  const seen = new Set();
  for (const d of fetched) {
    seen.add(String(d.id));
    const prev = store.tasks[d.id];
    store.tasks[d.id] = {
      ...d,
      first_seen: prev?.first_seen || nowIso,
      last_seen: nowIso,
      removed: false,
    };
  }
  // tasks previously inside this window but no longer returned → mark removed
  for (const [id, t] of Object.entries(store.tasks)) {
    if (seen.has(id)) continue;
    if (t.due >= windowStart && t.due <= windowEnd && !t.removed) {
      t.removed = true;
      t.removed_at = nowIso;
    }
  }
  store.syncedAt = nowIso;
  return store;
}

function daysLeft(dueIso, now) {
  const diff = new Date(dueIso).getTime() - now.getTime();
  return Math.ceil(diff / 864e5);
}

function fmtTable(list, now) {
  if (!list.length) return '  (nothing upcoming) 🎉';
  const rows = list.map((t) => {
    const dl = daysLeft(t.due, now);
    const when = String(t.due).slice(0, 16).replace('T', ' ');
    const badge = dl <= 1 ? '🔴' : dl <= 3 ? '🟠' : dl <= 7 ? '🟡' : '⚪';
    const left = dl < 0 ? `${-dl}d ago` : dl === 0 ? 'today' : `${dl}d`;
    let line = `  ${badge} ${when}  ${String(left).padStart(7)}  ${String(t.category || '').padEnd(11)} ${t.title.slice(0, 48)}`;
    if (t.detail) {
      const bits = [t.detail.teacher, (t.detail.labels || []).join('/'), t.detail.attachments?.length ? `📎${t.detail.attachments.length}` : null].filter(Boolean);
      if (bits.length) line += `\n         ↳ ${bits.join('  ·  ')}`;
    }
    return line;
  });
  return rows.join('\n');
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync('data', { recursive: true });
  const now = new Date();
  const nowIso = now.toISOString();

  console.log(`[track] logging in as ${process.env.MB_LOGIN} @ ${process.env.MB_SUBDOMAIN || 'diadubai'}`);
  const { ctx } = await login();

  // compute window
  let { start, end } = args;
  if (!start) start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 19);
  if (!end) end = new Date(now.getTime() + args.days * 864e5).toISOString().slice(0, 19);

  console.log(`[track] fetching deadlines ${start.slice(0, 10)} .. ${end.slice(0, 10)}`);
  const fetched = await fetchDeadlines(ctx, { start, end });
  console.log(`[track] feed returned ${fetched.length} items`);

  const store = merge(loadStore(), fetched, nowIso, start, end);

  // build the report list
  const all = Object.values(store.tasks).filter((t) => !t.removed);
  const upcoming = all
    .filter((t) => args.all || new Date(t.due).getTime() >= now.getTime() - 12 * 3600e3)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)));

  // optional enrichment: pull teacher / assessment type / attachments for the
  // tasks we're about to show (throttled 1/s inside the lib), cache in the store
  if (args.enrich) {
    const targets = (args.all ? upcoming : upcoming.filter((t) => daysLeft(t.due, now) >= 0 && daysLeft(t.due, now) <= 14)).filter((t) => t.classId);
    console.log(`[track] enriching ${targets.length} task(s) with detail…`);
    for (const t of targets) {
      try {
        const d = await fetchTaskDetail(ctx, t.classId, t.id);
        t.detail = { teacher: d.teacher, unit: d.unit, className: d.className, labels: d.labels, attachments: d.attachments };
        store.tasks[t.id].detail = t.detail;
      } catch (e) {
        // leave undecorated on error
      }
    }
  }

  await ctx.dispose();
  writeFileSync(STORE, JSON.stringify(store, null, 2));
  console.log(`[track] store now holds ${Object.keys(store.tasks).length} tasks -> ${STORE}`);

  if (args.json) {
    console.log(JSON.stringify(upcoming, null, 2));
    return;
  }

  const soon = upcoming.filter((t) => {
    const dl = daysLeft(t.due, now);
    return dl >= 0 && dl <= 7;
  });

  console.log(`\n📌 Due in the next 7 days (${soon.length}):`);
  console.log(fmtTable(soon, now));
  console.log(`\n🗓  ${args.all ? 'All' : 'All upcoming'} deadlines (${upcoming.length}):`);
  console.log(fmtTable(upcoming, now));
})().catch((e) => {
  console.error('ERROR', e.message || e);
  process.exit(1);
});
