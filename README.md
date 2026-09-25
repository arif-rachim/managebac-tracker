# managebac-tracker

managebac-tracker is personal tooling for a student's account on ManageBac, the school learning platform from Faria Education Group, and is the first step towards an automated tracker for classes, tasks and deadlines. ManageBac's official partner API at `api.managebac.com` uses tokens that are issued to schools and administrators, so a student account has no documented API to build on. The single Node.js script in this repo uses Playwright to open a headless Chromium, log in slowly with credentials taken from environment variables, and record every network request the web app makes. It then writes a de-duplicated list of the XHR, fetch and `/api/` endpoints and checks a few likely JSON paths using the logged-in session. The results go into a local `data/` folder that git ignores. Status: early reconnaissance. The script is complete but has not yet been run against the live site, and no tracker exists yet.

> Status: early development (one script, API discovery only).

## Features

- Logs in through the normal `/login` page of `https://<subdomain>.managebac.com` with Playwright and headless Chromium.
- Saves the login form's fields (tag, type, name, id, action, method) so selectors can be checked.
- Records every request the page makes and extracts the distinct API-style endpoints.
- After a successful login, probes `/student/self`, `/student/classes`, `/student/upcoming` and `/api/v1/students/self` (read-only GET requests with `Accept: application/json`).
- Saves cookie names, domains and `httpOnly` flags only, never cookie values.
- Deliberately slow, to avoid looking like a bot (see [Politeness](#politeness--anti-bot)).

## Tech stack

Node.js (ES modules, Node 18+ as required by Playwright) · Playwright 1.56 · Chromium

## Getting started

```bash
npm install
npx playwright install chromium
```

`scripts/login.mjs` launches Chromium from the fixed path `/opt/pw-browsers/chromium`, which is where the Claude Code web sandbox has it installed. When running on your own machine, change or remove `executablePath` in the script so Playwright uses the browser it downloaded.

Credentials come from environment variables so they never end up in git:

| Variable | Purpose |
|----------|---------|
| `MB_SUBDOMAIN` | Your school's ManageBac subdomain (the script has a default; set this for your school) |
| `MB_LOGIN` | Login email (required) |
| `MB_PASSWORD` | Password (required) |

```bash
MB_SUBDOMAIN=yourschool \
MB_LOGIN='you@school.email' \
MB_PASSWORD='your-password' \
npm run login
```

`npm run login` runs `node scripts/login.mjs`.

## Output

All files are written to `data/`, which is gitignored:

| File | Contents |
|------|----------|
| `login-form.json` | The login form's field names and ids, so we know what to fill |
| `after-login.png` | Screenshot after submitting, as visual proof of success or failure |
| `network-log.json` | Every request the page made (method, URL, resource type, host, path) |
| `api-endpoints.txt` | De-duplicated `METHOD host/path` list of XHR, fetch and `/api/` calls. This is the API map. |
| `api-probe.json` | Status codes and content types from probing candidate JSON endpoints (only written after a successful login) |
| `cookies-summary.json` | Session cookie names, domains and `httpOnly` flags; values are not saved |

## How "learning the API" works

ManageBac's student portal is a server-rendered Rails app with some XHR/JSON calls layered on top. Rather than guess endpoints, the script records what the app itself requests after a real login and reduces that to `api-endpoints.txt`, which is a reliable way to map an undocumented internal API. The probe step then tries a few likely JSON paths with the authenticated session to see which of them return JSON.

Expected login flow, still to be confirmed by a live run:

- Login page: `GET /login`. The form usually posts `login` and `password` plus a Rails/Devise CSRF `authenticity_token`, and the session is cookie-based after that.
- The script fills `input[name="login"]` (or `#session_login`, or any email input) and `input[name="password"]` (or `#session_password`), then clicks the submit button.
- Login is treated as successful when the page URL no longer contains `/login`.

## Politeness / anti-bot

- `slowMo: 250` ms on every Playwright action.
- Pauses of 1 to 2 seconds between opening the page, typing the login, typing the password and submitting.
- A throttle (`THROTTLE_MS = 1000`) that keeps at least one second between the requests the script starts itself: opening the login page, submitting the form, and each API probe. Sub-resources that the page loads on its own are not throttled.
- A fixed desktop Chrome user agent and a 1280x800 viewport.

## Network note (Claude Code on the web)

The script was written inside a Claude Code web environment whose egress policy only allowed GitHub and package registries. From there, `*.managebac.com` returned `403 CONNECT (policy denial)`, so the login could not be run live. To run it you need either your own machine with an open network, or a Claude Code environment whose network policy allows `managebac.com` (see https://code.claude.com/docs/en/claude-code-on-the-web).
