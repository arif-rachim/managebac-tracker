// Shared ManageBac client: log in and pull the calendar (deadline) feed.
//
// Uses Playwright's Node-based `request` API so it works through an HTTPS proxy
// (set HTTPS_PROXY + NODE_EXTRA_CA_CERTS). All calls are throttled to ~1/s and
// are strictly read-only.
import { request } from 'playwright';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// simple global 1-req/sec pacer so we never burst / look like a bot
const THROTTLE_MS = Number(process.env.MB_THROTTLE_MS || 1000);
let lastAt = 0;
export async function pace() {
  const wait = Math.max(0, lastAt + THROTTLE_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastAt = Date.now();
}

const extract = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};

// Log in and return an authenticated APIRequestContext.
// Throws on missing creds or failed login.
export async function login({ subdomain, loginEmail, password } = {}) {
  subdomain = subdomain || process.env.MB_SUBDOMAIN || 'diadubai';
  loginEmail = loginEmail || process.env.MB_LOGIN;
  password = password || process.env.MB_PASSWORD;
  const base = `https://${subdomain}.managebac.com`;

  if (!loginEmail || !password) {
    throw new Error('Set MB_LOGIN and MB_PASSWORD (and optionally MB_SUBDOMAIN).');
  }

  const ctx = await request.newContext({
    baseURL: base,
    ignoreHTTPSErrors: true, // proxy re-terminates TLS with its own CA
    extraHTTPHeaders: { 'User-Agent': UA },
  });

  await pace();
  const loginPage = await ctx.get('/login');
  const token = extract(await loginPage.text(), /name="authenticity_token"\s+value="([^"]+)"/);
  if (!token) throw new Error(`No authenticity_token on /login (status ${loginPage.status()}).`);

  await pace();
  const post = await ctx.post('/sessions', {
    form: { authenticity_token: token, login: loginEmail, password, commit: 'Sign in' },
    headers: { Referer: `${base}/login`, 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
  });
  const loc = post.headers()['location'] || '';
  if (post.status() !== 302 || loc.includes('/login')) {
    await ctx.dispose();
    throw new Error(`Login failed (status ${post.status()}). Check credentials.`);
  }

  // follow the Faria SSO bounce back to the dashboard (sets session cookies)
  await pace();
  await ctx.get(loc);

  return { ctx, base };
}

// Fetch the calendar feed and normalise it into tracker-friendly deadlines.
// window: { start, end } as ISO strings (default: today .. +daysAhead).
export async function fetchDeadlines(ctx, { start, end, tz, daysAhead = 60, now = new Date() } = {}) {
  const iso = (d) => d.toISOString().slice(0, 19);
  if (!start) start = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  if (!end) end = iso(new Date(now.getTime() + daysAhead * 864e5));
  tz = tz || process.env.MB_TZ || 'Asia/Muscat';

  await pace();
  const resp = await ctx.get(
    `/student/events.json?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&timeZone=${encodeURIComponent(tz)}`,
    { headers: { Accept: 'application/json', Referer: '/student/calendar' } }
  );
  if (resp.status() !== 200) throw new Error(`events.json returned ${resp.status()}`);

  let raw = [];
  try {
    raw = JSON.parse(await resp.text());
  } catch {
    throw new Error('events.json did not return JSON (session expired?).');
  }

  const stripHtml = (s) =>
    String(s || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  return raw.map((e) => ({
    id: e.id,
    title: (e.title || '').trim(),
    due: e.start,
    allDay: !!e.allDay,
    type: e.type,
    category: e.category,
    classId: (String(e.url).match(/classes\/(\d+)/) || [])[1] || null,
    url: e.url ? `https://${new URL(resp.url()).host}${e.url}` : null,
    description: stripHtml(e.description).slice(0, 500),
  }));
}

// Fetch the full detail ("hint" popover) for one calendar task. events.json
// gives each task a hint_url = /student/classes/{classId}/events/{eventId}/hint;
// this returns an HTML fragment with the teacher, unit, class, attachments
// (name + size + download href) and the full description.
export async function fetchTaskDetail(ctx, classId, eventId) {
  await pace();
  const resp = await ctx.get(`/student/classes/${classId}/events/${eventId}/hint`);
  if (resp.status() !== 200) throw new Error(`hint ${classId}/${eventId} -> ${resp.status()}`);
  const html = await resp.text();
  const host = new URL(resp.url()).host;

  const strip = (s) =>
    String(s || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

  // value inside the <dd> that follows a <dt> whose label text matches
  const field = (label) => {
    const re = new RegExp(`${label}:</span></dt><dd[^>]*>(.*?)</dd>`, 'is');
    const m = html.match(re);
    return m ? strip(m[1]) : null;
  };

  const attachments = [...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*class="fr-file"[^>]*data-name="([^"]+)"[\s\S]*?fr-file-size">([^<]+)</gi)].map(
    (m) => ({ name: m[2], size: m[3].trim(), href: m[1].startsWith('http') ? m[1] : `https://${host}${m[1]}` })
  );

  const title = strip((html.match(/f-tile__title[^>]*>\s*<a[^>]*>(.*?)<\/a>/is) || [])[1]);
  // coloured pills, e.g. ["Formative","Homework"] (assessment kind + category)
  const labels = [...html.matchAll(/class=['"]label['"][^>]*>([^<]+)</gi)].map((m) => strip(m[1])).filter(Boolean);

  return {
    classId,
    eventId,
    title,
    labels,
    teacher: field('Teacher'),
    unit: field('Unit'),
    className: field('Class'),
    attachments,
  };
}

// --- Faria notifications hub (mnn-hub) --------------------------------------
// The student notifications/messages live on a separate Faria service. The
// managebac page embeds a short-lived ES512 JWT (data-token) + the hub URL
// (data-mnn-hub-endpoint) on the notifications-trigger element. The hub is a
// real JSON REST API authenticated with `Authorization: Bearer <jwt>` and a
// CORS Origin of the school's managebac host.

// Read the embedded hub endpoint + bearer token from any student page that
// renders the notifications trigger (/student/notifications is reliable).
export async function getHub(ctx, base) {
  await pace();
  const html = await (await ctx.get('/student/notifications')).text();
  const token = (html.match(/data-token="([^"]+)"/) || [])[1];
  const endpoint = (html.match(/data-mnn-hub-endpoint="([^"]+)"/) || [])[1];
  if (!token || !endpoint) throw new Error('Could not find hub token/endpoint on the notifications page.');
  const origin = base || `https://${process.env.MB_SUBDOMAIN || 'diadubai'}.managebac.com`;
  return {
    endpoint,
    token,
    headers: {
      Authorization: `Bearer ${token}`,
      Origin: origin,
      Accept: 'application/json',
    },
  };
}

const stripHtmlG = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Unread-message count: { unread_messages }
export async function notificationStats(ctx, hub) {
  await pace();
  const r = await ctx.get(`${hub.endpoint}/api/frontend/v2/notifications/stats`, { headers: hub.headers });
  return (JSON.parse(await r.text())).stats;
}

// List notifications. kind = 'unread' | 'read' | 'starred'. Paginated.
// Set perPage up to 100; pass all:true to auto-follow pages until has_more=false.
export async function fetchNotifications(ctx, hub, { kind = 'unread', perPage = 100, all = false } = {}) {
  const items = [];
  let page = 1;
  let meta = null;
  for (;;) {
    await pace();
    const r = await ctx.get(
      `${hub.endpoint}/api/frontend/v2/notifications?page=${page}&per_page=${perPage}&kind=${encodeURIComponent(kind)}`,
      { headers: hub.headers }
    );
    if (r.status() !== 200) throw new Error(`notifications ${kind} p${page} -> ${r.status()}`);
    const j = JSON.parse(await r.text());
    meta = j.meta;
    for (const n of j.items || []) {
      items.push({
        id: n.id,
        title: (n.title || '').trim(),
        created_at: n.created_at,
        event_name: n.event_name,
        sender: (n.sender && (n.sender.name || n.sender.initials)) || null,
        starred: !!n.starred,
        is_read: !!n.is_read,
        preview: stripHtmlG(n.body_preview || n.description || n.body).slice(0, 300),
        origin: n.origin,
      });
    }
    if (!all || !j.meta?.has_more) break;
    page++;
  }
  return { items, meta };
}

// Mark a single notification read (write op — only when explicitly asked).
export async function markNotificationRead(ctx, hub, id) {
  await pace();
  const r = await ctx.fetch(`${hub.endpoint}/api/frontend/v2/notifications/${id}/read`, {
    method: 'PUT',
    headers: { ...hub.headers, 'Content-Type': 'application/json' },
    data: '{}',
  });
  return r.status();
}
