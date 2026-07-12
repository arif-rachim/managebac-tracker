// Submission tracker — Ardy's "what do I still have to hand in?" list.
//
// This is a LOCAL overlay on top of the deadline store (data/store.json that
// track.mjs builds). ManageBac's student feed does not expose submission state,
// so we track it ourselves: each task gets a status (todo | doing | submitted).
// Marking is offline (no login) — it just edits the store.
//
// Usage:
//   node scripts/submit.mjs                 # to-submit list + summary (default)
//   node scripts/submit.mjs list [--all]    # list (default: due-soon+overdue)
//   node scripts/submit.mjs doing  <id...>  # mark in-progress
//   node scripts/submit.mjs done   <id...>  # mark submitted
//   node scripts/submit.mjs undo   <id...>  # back to todo
//   node scripts/submit.mjs note   <id> ... # attach a free-text note
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const STORE = 'data/store.json';
const STATUS = { todo: 'todo', doing: 'doing', submitted: 'submitted' };

function load() {
  if (!existsSync(STORE)) {
    console.error(`No ${STORE} yet — run scripts/track.mjs first to fetch deadlines.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(STORE, 'utf8'));
}
const save = (s) => writeFileSync(STORE, JSON.stringify(s, null, 2));

const daysLeft = (due, now) => Math.ceil((new Date(due).getTime() - now) / 864e5);

function setStatus(store, ids, status, nowIso) {
  let n = 0;
  for (const id of ids) {
    const t = store.tasks[id];
    if (!t) {
      console.error(`  ! unknown task id ${id}`);
      continue;
    }
    t.status = status;
    if (status === STATUS.submitted) t.submittedAt = nowIso;
    else delete t.submittedAt;
    n++;
    console.log(`  ${status === STATUS.submitted ? '✅' : status === STATUS.doing ? '🛠' : '↩︎'} ${status.padEnd(9)} ${t.title.slice(0, 50)}`);
  }
  return n;
}

function line(t, now) {
  const dl = daysLeft(t.due, now);
  const when = String(t.due).slice(0, 16).replace('T', ' ');
  const st = t.status || 'todo';
  const mark = st === 'submitted' ? '✅' : st === 'doing' ? '🛠' : dl < 0 ? '⚠️' : dl <= 1 ? '🔴' : dl <= 3 ? '🟠' : dl <= 7 ? '🟡' : '⚪';
  const left = dl < 0 ? `${-dl}d late` : dl === 0 ? 'today' : `${dl}d`;
  const who = t.detail?.teacher ? `  · ${t.detail.teacher}` : '';
  return `  ${mark} ${when}  ${String(left).padStart(8)}  ${String(t.category || '').padEnd(11)} ${t.title.slice(0, 44)}${who}\n        id ${t.id}${t.note ? `  📝 ${t.note}` : ''}`;
}

(function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const store = load();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const tasks = Object.values(store.tasks).filter((t) => !t.removed);

  if (cmd === 'done' || cmd === 'doing' || cmd === 'undo') {
    const map = { done: STATUS.submitted, doing: STATUS.doing, undo: STATUS.todo };
    const n = setStatus(store, rest, map[cmd], nowIso);
    if (n) save(store);
    return;
  }
  if (cmd === 'note') {
    const [id, ...words] = rest;
    const t = store.tasks[id];
    if (!t) return console.error(`unknown id ${id}`);
    t.note = words.join(' ');
    save(store);
    return console.log(`📝 noted on ${t.title.slice(0, 50)}`);
  }

  // default / list
  const all = cmd === 'list' && rest.includes('--all');
  const pending = tasks.filter((t) => (t.status || 'todo') !== 'submitted');
  const window = all ? pending : pending.filter((t) => daysLeft(t.due, now) <= 7); // overdue + next 7d
  window.sort((a, b) => String(a.due).localeCompare(String(b.due)));

  const overdue = pending.filter((t) => daysLeft(t.due, now) < 0);
  const submitted = tasks.filter((t) => t.status === 'submitted');

  console.log(`📋 To submit${all ? ' (all pending)' : ' (overdue + next 7 days)'} — ${window.length} item(s)\n`);
  console.log(window.length ? window.map((t) => line(t, now)).join('\n') : '  🎉 nothing to hand in right now');
  console.log(`\n────────────────────────────────────────`);
  console.log(`  pending: ${pending.length}   overdue-unsubmitted: ${overdue.length}   submitted: ${submitted.length}`);
  console.log(`  tip: scripts/submit.mjs done <id>   (mark handed in)`);
})();
