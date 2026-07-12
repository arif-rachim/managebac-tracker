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
