// ManageBac login + API reconnaissance (personal account)
//
// Goal: log into the school's ManageBac slowly (throttled, ~1s between steps)
// so we don't look like a bot, then record every network request the SPA makes
// so we can learn which API endpoints exist.
//
// Credentials are read from the environment so they never end up in git:
//   MB_LOGIN=...  MB_PASSWORD=...  MB_SUBDOMAIN=diadubai  node scripts/login.mjs
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';

const SUBDOMAIN = process.env.MB_SUBDOMAIN || 'diadubai';
const BASE = `https://${SUBDOMAIN}.managebac.com`;
const LOGIN = process.env.MB_LOGIN;
const PASSWORD = process.env.MB_PASSWORD;

if (!LOGIN || !PASSWORD) {
  console.error('Set MB_LOGIN and MB_PASSWORD env vars.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// throttle: ensure at least THROTTLE_MS between any two outgoing requests
const THROTTLE_MS = 1000;
let lastRequestAt = 0;
async function pace() {
  const now = Date.now();
  const wait = Math.max(0, lastRequestAt + THROTTLE_MS - now);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

const requests = [];

(async () => {
  mkdirSync('data', { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/opt/pw-browsers/chromium',
    slowMo: 250, // slow down every action a little
  });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });

  // record every request the page makes
  context.on('request', (req) => {
    const u = new URL(req.url());
    requests.push({
      method: req.method(),
      url: req.url(),
      resourceType: req.resourceType(),
      host: u.host,
      path: u.pathname,
    });
  });

  const page = await context.newPage();

  console.log(`[1] opening ${BASE}/login`);
  await pace();
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await sleep(1000);

  // dump the login form structure so we know the field names
  const formInfo = await page.evaluate(() => {
    const inputs = [...document.querySelectorAll('input, button, form')].map((el) => ({
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type'),
      name: el.getAttribute('name'),
      id: el.getAttribute('id'),
      action: el.getAttribute('action'),
      method: el.getAttribute('method'),
    }));
    return { title: document.title, url: location.href, inputs };
  });
  console.log('[login form]', JSON.stringify(formInfo, null, 2));
  writeFileSync('data/login-form.json', JSON.stringify(formInfo, null, 2));

  // Fill login field. ManageBac uses name="login" (email) and name="password".
  const loginSel = 'input[name="login"], input#session_login, input[type="email"]';
  const passSel = 'input[name="password"], input#session_password, input[type="password"]';

  console.log('[2] typing login (slow)');
  await sleep(1000);
  await page.fill(loginSel, LOGIN);
  await sleep(1000);
  await page.fill(passSel, PASSWORD);
  await sleep(1000);

  console.log('[3] submitting');
  await pace();
  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => {}),
    page.click('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")'),
  ]);
  await sleep(2000);

  const afterLogin = { url: page.url(), title: await page.title() };
  console.log('[after login]', JSON.stringify(afterLogin));

  // Is login successful? A failed login stays on /login.
  const loggedIn = !page.url().includes('/login');
  console.log(loggedIn ? '[✓] appears logged in' : '[✗] still on login page (failed?)');

  // grab a screenshot for evidence
  await page.screenshot({ path: 'data/after-login.png', fullPage: false });

  // cookies (tokens live here) — save names only, not values, to a summary
  const cookies = await context.cookies();
  writeFileSync(
    'data/cookies-summary.json',
    JSON.stringify(cookies.map((c) => ({ name: c.name, domain: c.domain, httpOnly: c.httpOnly })), null, 2)
  );

  writeFileSync('data/network-log.json', JSON.stringify(requests, null, 2));
  console.log(`[net] captured ${requests.length} requests -> data/network-log.json`);

  // ---- API reconnaissance ------------------------------------------------
  // Summarise which distinct hosts + JSON/XHR endpoints the SPA actually hit.
  // This is how we "learn the API": the app tells us its own endpoints.
  const apiCalls = requests.filter(
    (r) => r.resourceType === 'xhr' || r.resourceType === 'fetch' || r.path.includes('/api/')
  );
  const endpoints = [...new Set(apiCalls.map((r) => `${r.method} ${r.host}${r.path}`))].sort();
  writeFileSync('data/api-endpoints.txt', endpoints.join('\n') + '\n');
  console.log(`[api] discovered ${endpoints.length} distinct API endpoints -> data/api-endpoints.txt`);
  endpoints.slice(0, 40).forEach((e) => console.log('   ', e));

  if (loggedIn) {
    // Probe a few candidate JSON endpoints, reusing the logged-in session
    // cookies. Throttled: one request per second. We only READ.
    const candidates = [
      '/student/self',
      '/student/classes',
      '/student/upcoming',
      '/api/v1/students/self',
    ];
    const probeResults = [];
    for (const p of candidates) {
      await pace();
      try {
        const resp = await page.request.get(`${BASE}${p}`, {
          headers: { Accept: 'application/json' },
        });
        const ct = resp.headers()['content-type'] || '';
        probeResults.push({ path: p, status: resp.status(), contentType: ct });
        console.log(`[probe] ${resp.status()} ${p} (${ct})`);
      } catch (e) {
        probeResults.push({ path: p, error: String(e) });
      }
    }
    writeFileSync('data/api-probe.json', JSON.stringify(probeResults, null, 2));
  }

  await browser.close();
})().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});
