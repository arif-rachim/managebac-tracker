# managebac-tracker

Personal tooling to log into a school ManageBac account (Faria Education Group)
with Playwright and discover the API endpoints the web app uses, so we can later
build an automated tracker.

## ⚠️ Network note (Claude Code on the web)

This was set up inside a Claude Code web environment whose **egress policy only
allows GitHub + package registries**. From there, `*.managebac.com` returns
`403 CONNECT (policy denial)` — the same as `google.com` — so the login could
**not** be run live in that environment. GitHub was reachable (200), everything
else was blocked.

To actually run the login you need one of:

- **Run it locally** on your own machine (open network), or
- Use a Claude Code environment whose network policy allows `managebac.com`
  (see https://code.claude.com/docs/en/claude-code-on-the-web).

The script itself is complete and ready — only the network was the blocker.

## Setup

```bash
npm install
```

Chromium: on a normal machine `npx playwright install chromium` once. (In the
Claude web sandbox it's pre-installed at `/opt/pw-browsers/chromium`, which the
script points to — change `executablePath` / remove it when running locally.)

## Run

Credentials are read from env vars so they never land in git:

```bash
MB_SUBDOMAIN=diadubai \
MB_LOGIN='you@school.email' \
MB_PASSWORD='your-password' \
node scripts/login.mjs
```

Outputs land in `data/` (gitignored):

| file | what |
|------|------|
| `login-form.json` | the login form's field names/ids (so we know what to fill) |
| `after-login.png` | screenshot after submit — visual proof of success/failure |
| `network-log.json` | every request the page made |
| `api-endpoints.txt` | de-duped list of the XHR/fetch/`/api/` endpoints the app calls — **this is the API map** |
| `api-probe.json` | status codes from probing a few candidate JSON endpoints |
| `cookies-summary.json` | session cookie names (session token lives here; values not saved) |

## How "learning the API" works here

ManageBac's student portal is a server-rendered Rails app with some XHR/JSON
calls layered on. Rather than guess endpoints, the script **records what the app
itself requests** after a real login, then de-dupes them into `api-endpoints.txt`.
That's the reliable way to map an undocumented internal API. The probe step then
tries a few likely JSON paths with the authenticated session cookies to see which
return JSON.

Notes on how the login flow generally works (to be confirmed by a live run):

- Login page: `GET /login`. The form typically posts `login` + `password` plus a
  CSRF `authenticity_token` (Rails/Devise). Session is cookie-based after that.
- There is also an official **partner API** at `api.managebac.com` that uses an
  `auth-token` header, but that's issued to schools/admins, not student logins —
  so a student tracker relies on the cookie session above.

## Politeness / anti-bot

The script is deliberately slow to avoid looking like a bot:

- `slowMo: 250ms` on every Playwright action,
- human-like pauses (`sleep`) between typing login, password, and submit,
- a global throttle so **no two outgoing requests fire less than 1s apart**
  (`THROTTLE_MS`), including the API probes.
