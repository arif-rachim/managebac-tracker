// ManageBac / Faria notifications reader.
//
// Logs in, reads the embedded hub JWT, and lists messages/notifications from
// the Faria hub (mnn-hub). Read-only by default; --mark-read <id> is the only
// write action and must be requested explicitly.
//
// Usage:
//   MB_LOGIN=... MB_PASSWORD=... MB_SUBDOMAIN=diadubai \
//   NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
//   node scripts/notifications.mjs [--kind unread|read|starred] [--limit N] [--json]
//   node scripts/notifications.mjs --mark-read 123456789
import { writeFileSync, mkdirSync } from 'node:fs';
import { login, getHub, notificationStats, fetchNotifications, markNotificationRead } from './lib/managebac.mjs';

function parseArgs(argv) {
  const a = { kind: 'unread', limit: 30 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--kind') a.kind = argv[++i];
    else if (k === '--limit') a.limit = Number(argv[++i]);
    else if (k === '--json') a.json = true;
    else if (k === '--all') a.all = true;
    else if (k === '--mark-read') a.markRead = argv[++i];
  }
  return a;
}

const ago = (iso, now) => {
  const h = (now - new Date(iso).getTime()) / 36e5;
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
};

(async () => {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync('data', { recursive: true });
  const now = Date.now();

  const { ctx, base } = await login();
  const hub = await getHub(ctx, base);

  if (args.markRead) {
    const status = await markNotificationRead(ctx, hub, args.markRead);
    console.log(`mark-read ${args.markRead} -> HTTP ${status}`);
    await ctx.dispose();
    return;
  }

  const stats = await notificationStats(ctx, hub);
  const { items, meta } = await fetchNotifications(ctx, hub, {
    kind: args.kind,
    all: args.all,
    perPage: args.all ? 100 : Math.min(args.limit, 100),
  });
  await ctx.dispose();

  writeFileSync('data/notifications.json', JSON.stringify({ stats, kind: args.kind, meta, items }, null, 2));

  if (args.json) {
    console.log(JSON.stringify(items.slice(0, args.limit), null, 2));
    return;
  }

  console.log(`🔔 Unread messages: ${stats.unread_messages}`);
  console.log(`\n${args.kind} notifications (${meta.total} total, showing ${Math.min(items.length, args.limit)}):\n`);
  for (const n of items.slice(0, args.limit)) {
    const flags = `${n.is_read ? ' ' : '●'}${n.starred ? '★' : ' '}`;
    const when = ago(n.created_at, now).padStart(4);
    console.log(`  ${flags} ${when}  ${(n.title || n.event_name || '').slice(0, 42).padEnd(42)} ${n.sender || ''}`);
    if (n.preview) console.log(`         ${n.preview.slice(0, 90)}`);
  }
})().catch((e) => {
  console.error('ERROR', e.message || e);
  process.exit(1);
});
