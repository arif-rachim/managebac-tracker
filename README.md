# managebac-tracker

Personal tooling to log into a school ManageBac account (Faria Education Group)
and discover the endpoints the web app uses, so we can later build an automated
tracker. Target school: `diadubai.managebac.com`.

## What works, and the network reality

This runs inside a Claude Code web environment where **all outbound HTTPS goes
through an egress proxy** (`HTTPS_PROXY`). Two things follow from that:

- **`*.managebac.com` is reachable** through the proxy. Login and API recon
  succeed here. (An earlier note in this repo said it was policy-blocked — that
  was wrong; it was a browser/proxy config problem, not an egress denial.)
- **A real Chromium browser cannot egress** in this environment. Chromium does
  DNS-over-HTTPS straight to `8.8.8.8`, bypassing the proxy, so every page
  navigation dies with `ERR_CONNECTION_RESET`. Disabling DoH via flags did not
  stick. So the browser script only works where Chromium has open network.

Because of that there are **two scripts**:

| script | engine | runs in the web sandbox? | use when |
|--------|--------|--------------------------|----------|
| `scripts/api-recon.mjs` | Playwright **`request`** (Node HTTP, honours the proxy) | ✅ yes | recon / automation / any proxied env |
| `scripts/login.mjs` | Playwright **Chromium** (real browser) | ❌ no (DoH bypass) | your own machine / open network |

`api-recon.mjs` replays the exact HTTP flow a browser performs (form login → SSO
redirect → session cookie), so it learns the same API without needing a GUI.

## Setup

```bash
npm install
```

## Run (recommended — works through the proxy)

Credentials are read from env vars so they never land in git:

```bash
MB_SUBDOMAIN=diadubai \
MB_LOGIN='you@school.email' \
MB_PASSWORD='your-password' \
NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
node scripts/api-recon.mjs
```

(`NODE_EXTRA_CA_CERTS` makes Node trust the proxy's TLS CA. Drop it when running
on an open network off your own machine.)

Outputs land in `data/` (gitignored):

| file | what |
|------|------|
| `student-home.html` | the logged-in `/student/home` dashboard |
| `api-map.json` | every probed endpoint with status / content-type / size |
| `api-endpoints.txt` | the same, one line per endpoint — **the API map** |
| `cookies-summary.json` | session cookie names (values not saved) |

## Run the real browser (open network only)

`scripts/login.mjs` drives Chromium, fills the form, screenshots the result and
records live network traffic. It routes through `HTTPS_PROXY` if set, but see the
DoH caveat above — in the web sandbox it will fail to connect.

## The login flow (confirmed by a live run)

1. `GET /login` → HTML form. Fields: `login` (email), `password`,
   `commit`, and a Rails CSRF `authenticity_token` (hidden input) plus a
   `<meta name="csrf-token">`.
2. `POST /sessions` with those fields → **`302`** to Faria SSO:
   `https://accounts.faria.org/accounts/otsi?token=…`.
3. Following that redirect bounces back and lands on
   `https://diadubai.managebac.com/student/home` with the session cookies set:
   `_managebac_session`, `user`, `user_id`.

A wrong password keeps you on `/login` (no 302), which is how the script detects
failure.

## The "API" — what you can actually call

ManageBac's **student portal is a server-rendered Rails app**, not a JSON REST
API. The authenticated endpoints the SPA hits return either:

- **`text/javascript`** (Rails SJR) — JS that injects HTML via jQuery, e.g.
  `$('#classes').html('…')`, or
- **`text/html`** partials.

There is a JSON content-negotiation layer for errors only (`{"status":404,…}`,
`406 Not Acceptable`), but the data endpoints do not serve JSON to a student
session. Confirmed working endpoints (all `200` with the session cookie):

```
/student/home                                 full dashboard (HTML)
/student/home_page/sections/my_classes        HTML partial — class list (14 classes)
/student/home_page/sections/tasks_and_deadlines  HTML partial — upcoming work
/student/home_page/sections/calendar          HTML partial — calendar widget
/student/home_page/calendar.js                JS — builds the calendar widget
/student/classes/my                           JS — renders the class accordion
/student/classes/{id}                         JS — a single class (ids in the dashboard)
/student/tasks_and_deadlines                  JS — deadlines panel
/student/profile                              JS — profile / academic tabs
/student/portfolio                            JS — portfolio (largest payload, ~220KB)
/student/groups/all                           JS — groups
/student/calendar                             full calendar page (HTML)
/student/notifications                        full notifications page (HTML)
```

**Implication for a tracker:** scrape these authenticated HTML/JS fragments
(parse the injected HTML out of the JS with a regex/DOM parser) rather than
expecting clean JSON. Class ids are discovered from the dashboard
(`/student/classes/{id}` links).

> There is also an official **partner API** at `api.managebac.com` using an
> `auth-token` header, but tokens are issued to schools/admins, not student
> logins — so a student tracker relies on the cookie session above.

## Politeness / anti-bot

Both scripts throttle so **no two outgoing requests fire less than 1s apart**
(`THROTTLE_MS`), and send a normal desktop Chrome `User-Agent`. `login.mjs` adds
`slowMo` and human-like pauses between typing fields. Everything is **read-only**.
