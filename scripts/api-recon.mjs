// ManageBac login + API reconnaissance using Playwright's APIRequestContext.
//
// Why not a real browser? In the managed/web environment Chromium cannot reach
// the internet: it performs DNS-over-HTTPS straight to 8.8.8.8, bypassing the
// egress proxy, so every navigation ends in ERR_CONNECTION_RESET. Playwright's
// `request` API is Node-based, so it honours HTTPS_PROXY + NODE_EXTRA_CA_CERTS
// and works. It replays exactly the HTTP flow a browser would (form login,
// SSO redirect, session cookie) — which is all we need to learn the API.
//
// Usage (credentials come from the environment, never git):
//   MB_LOGIN=... MB_PASSWORD=... MB_SUBDOMAIN=diadubai \
//   NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/api-recon.mjs
//
// Everything here is READ-only. Requests are throttled to ~1/second so we
// never look like a burst / bot.
import { request } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const SUBDOMAIN = process.env.MB_SUBDOMAIN || 'diadubai';
const BASE = `https://${SUBDOMAIN}.managebac.com`;
const LOGIN = process.env.MB_LOGIN;
const PASSWORD = process.env.MB_PASSWORD;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

if (!LOGIN || !PASSWORD) {
  console.error('Set MB_LOGIN and MB_PASSWORD env vars.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const THROTTLE_MS = 1000;
let lastAt = 0;
async function pace() {
  const wait = Math.max(0, lastAt + THROTTLE_MS - Date.now());
  if (wait > 0) await sleep(wait);
  lastAt = Date.now();
}

// pull a hidden-field or <meta> token value out of an HTML string
function extract(html, re) {
  const m = html.match(re);
  return m ? m[1] : null;
}

(async () => {
  mkdirSync('data', { recursive: true });

  const ctx = await request.newContext({
    baseURL: BASE,
    ignoreHTTPSErrors: true, // proxy re-terminates TLS with its own CA
    extraHTTPHeaders: { 'User-Agent': UA },
  });

  // 1. GET /login → grab the CSRF authenticity_token + cookies
  await pace();
  const loginPage = await ctx.get('/login');
  const loginHtml = await loginPage.text();
  const token = extract(loginHtml, /name="authenticity_token"\s+value="([^"]+)"/);
  console.log(`[1] GET /login -> ${loginPage.status()} (token ${token ? 'found' : 'MISSING'})`);
  if (!token) {
    console.error('Could not find authenticity_token on the login page.');
    process.exit(1);
  }

  // 2. POST /sessions with the form fields the login page submits
  await pace();
  const post = await ctx.post('/sessions', {
    form: {
      authenticity_token: token,
      login: LOGIN,
      password: PASSWORD,
      commit: 'Sign in',
    },
    headers: { Referer: `${BASE}/login`, 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0, // inspect the redirect ourselves
  });
  const loc = post.headers()['location'] || '';
  const ok = post.status() === 302 && !loc.includes('/login');
  console.log(`[2] POST /sessions -> ${post.status()} ${ok ? '(credentials OK)' : '(LOGIN FAILED)'}`);
  console.log(`    redirect -> ${loc}`);
  if (!ok) {
    console.error('Login failed — check credentials.');
    await ctx.dispose();
    process.exit(1);
  }

  // 3. Follow the SSO chain (Faria accounts) back to the dashboard.
  //    APIRequestContext follows redirects by default; one GET lands us home.
  await pace();
  const home = await ctx.get(loc); // absolute Faria URL, then bounces back to us
  const homeHtml = await home.text();
  const csrf = extract(homeHtml, /csrf-token"\s+content="([^"]+)"/);
  console.log(`[3] followed SSO -> ${home.url()} (${home.status()})`);
  writeFileSync('data/student-home.html', homeHtml);

  // cookie names only (values are secret) for evidence
  const cookies = (await ctx.storageState()).cookies;
  writeFileSync(
    'data/cookies-summary.json',
    JSON.stringify(cookies.map((c) => ({ name: c.name, domain: c.domain })), null, 2)
  );

  // 4. Probe the endpoints the student SPA actually uses. These are Rails
  //    "SJR" endpoints: they return text/javascript that injects HTML, or
  //    HTML partials — ManageBac's student area is NOT a JSON REST API.
  const endpoints = [
    '/student/home_page/sections/my_classes',
    '/student/home_page/sections/tasks_and_deadlines',
    '/student/home_page/sections/calendar',
    '/student/home_page/calendar.js',
    '/student/classes/my',
    '/student/tasks_and_deadlines',
    '/student/notifications',
    '/student/profile',
    '/student/portfolio',
    '/student/groups/all',
    '/student/calendar',
  ];

  const map = [];
  for (const path of endpoints) {
    await pace();
    try {
      const resp = await ctx.get(path, {
        headers: {
          Accept: 'text/javascript, application/json, text/html, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          Referer: `${BASE}/student/home`,
        },
      });
      const ct = resp.headers()['content-type'] || '';
      const body = await resp.text();
      map.push({ path, status: resp.status(), contentType: ct, bytes: body.length });
      console.log(`[probe] ${resp.status()} ${path.padEnd(45)} ${ct.split(';')[0]} (${body.length}B)`);
    } catch (e) {
      map.push({ path, error: String(e) });
      console.log(`[probe] ERR  ${path} — ${e}`);
    }
  }

  writeFileSync('data/api-map.json', JSON.stringify(map, null, 2));
  writeFileSync(
    'data/api-endpoints.txt',
    map.filter((m) => m.status).map((m) => `${m.status}  ${m.contentType?.split(';')[0] || ''}\t${m.path}`).join('\n') + '\n'
  );
  console.log(`\n[done] wrote data/api-map.json (${map.length} endpoints)`);

  await ctx.dispose();
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});
