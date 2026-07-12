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

Because of that the scripts use Playwright's **`request`** API (Node HTTP, which
honours the proxy) rather than a real browser:

| script | what it does | runs in the web sandbox? |
|--------|--------------|--------------------------|
| `scripts/track.mjs` | **the tracker** — sync deadlines into a store, report what's due | ✅ yes |
| `scripts/notifications.mjs` | read messages/notifications from the Faria hub | ✅ yes |
| `scripts/api-recon.mjs` | map every endpoint the portal exposes (recon) | ✅ yes |
| `scripts/lib/managebac.mjs` | shared login + calendar-feed client | — |
| `scripts/login.mjs` | real Chromium browser (screenshots, live network log) | ❌ no (DoH bypass) |

The `request`-based scripts replay the exact HTTP flow a browser performs (form
login → SSO redirect → session cookie), so they reach the same data without a GUI.

## Setup

```bash
npm install
```

## Deadline tracker

`scripts/track.mjs` is the actual tracker. It logs in, pulls the `events.json`
feed for a rolling window, merges it into a local JSON store (`data/store.json`,
deduped by task id, remembering `first_seen` / `last_seen` and flagging tasks
that disappear from the feed), and prints upcoming deadlines with a countdown.

```bash
MB_SUBDOMAIN=diadubai \
MB_LOGIN='you@school.email' \
MB_PASSWORD='your-password' \
NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
node scripts/track.mjs --days 60
```

Flags: `--days N` (look-ahead window, default 60), `--start ISO --end ISO`
(explicit window, e.g. a past term), `--all` (list everything stored, not just
upcoming), `--enrich` (fetch teacher / assessment type / attachments for the
tasks shown), `--json` (machine-readable output). Colour badges: 🔴 ≤1 day, 🟠 ≤3,
🟡 ≤7, ⚪ later. Re-run it any time (e.g. from cron) — the store accumulates and
deduplicates, so history is preserved even as the feed window moves.

Shared login/fetch logic lives in `scripts/lib/managebac.mjs` (reused by both
the tracker and the recon script).

## Recon — map all endpoints (optional)

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

## ⭐ The one real JSON endpoint — the calendar feed

Captured from a browser HAR of a real session, the student calendar loads its
data from a genuine JSON endpoint (auth = session cookie only):

```
GET /student/events.json?start=<ISO>&end=<ISO>&timeZone=Asia/Muscat
```

It returns a JSON **array of every task / deadline / event** in the window —
exactly what a tracker needs, no HTML scraping:

```json
{
  "id": 47308532,
  "title": "Romeo and Juliet",
  "start": "2026-03-01T13:20:00.000+04:00",
  "end": null,
  "description": "<p>Please refer to my post on Teams…</p>",
  "type": "CoreTask",
  "category": "Work Sheet",          // Homework | Project | Report | Task | Work Sheet
  "url": "/student/classes/12880214/core_tasks/47308532",
  "hint_url": "/student/classes/12880214/events/47308532/hint",
  "backgroundColor": "#6ccff7"
}
```

`api-recon.mjs` fetches this window (override with `MB_START` / `MB_END` /
`MB_TZ`) and writes `data/events.json` (raw) plus `data/deadlines.json` (slim:
`{id, due, title, type, category, classId, url}`). **Build the tracker on this.**

### Per-task detail (the `hint` endpoint)

Each event carries a `hint_url`. Fetching it returns an HTML fragment with the
full task detail:

```
GET /student/classes/{classId}/events/{eventId}/hint
```

Parsed into: `{title, labels:["Formative","Homework"], teacher, unit, className,
attachments:[{name, size, href}]}` — where each attachment `href` is a signed
`/attachments/<blob>` download URL. `fetchTaskDetail()` in the lib does this, and
`track.mjs --enrich` decorates the deadline report with teacher / assessment
type / attachment count.

## ⭐ Second real JSON API — the Faria notifications hub

A HAR of the **notifications** page revealed a full REST API on a separate Faria
service, `https://mnn-hub-ca.prod.faria.co/api/frontend/v2`:

| method | endpoint | what |
|--------|----------|------|
| `GET` | `/notifications/stats` | `{"stats":{"unread_messages":N}}` |
| `GET` | `/notifications?page=1&per_page=100&kind=unread\|read\|starred` | paginated list |
| `PUT` | `/notifications/{id}/read` | mark one read |

**Auth is a bearer JWT, not a cookie.** The managebac page embeds a short-lived
ES512 JWT on the notifications-trigger element:

```html
<a class="…js-messages-and-notifications-trigger…"
   data-token="eyJhbGciOiJFUzUxMiJ9.…"          <!-- the bearer JWT -->
   data-mnn-hub-endpoint="https://mnn-hub-ca.prod.faria.co"
   data-namespace="student" …>
```

(JWT payload: `{user_id, user_portal_account_id, email, iss:"managebac"}`.) You
call the hub with `Authorization: Bearer <data-token>` and
`Origin: https://<subdomain>.managebac.com`. Confirmed working live.

Each list item: `{id, title, created_at, body (HTML), body_preview, event_name,
sender:{name,initials}, starred, is_read, origin, metadata}`. Notification types
include *New Task*, *Task Reminder*, *Updated Task*, *New File Uploaded*, and
*Class Digest* (which itself lists upcoming deadlines) — a second, event-driven
signal for the tracker on top of the calendar feed.

Run it:

```bash
node scripts/notifications.mjs --kind unread          # or read | starred
node scripts/notifications.mjs --kind read --all      # follow all pages
node scripts/notifications.mjs --mark-read 123456789  # the only write action
```

Writes `data/notifications.json`. The page also opens a WebSocket
(`wss://<subdomain>.managebac.com/websocket`, ActionCable) for live pushes, and
serves attachments via signed `/attachments/<blob>` URLs — not needed for
tracking, but that's what the rest of the HAR is.

Everything else in the HAR (68 requests to `assets.managebac.com`, plus
`bam.nr-data.net`, `clarity.ms`, `google-analytics.com`, `zendesk.com`) is
static assets and third-party telemetry — ignore it.

## The rest of the "API" — server-rendered fragments

Apart from `events.json`, ManageBac's **student portal is a server-rendered
Rails app**, not a JSON REST API. The authenticated endpoints the SPA hits
return either:

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

## Official ManageBac+ Public API (for context)

There is a real, documented API — but it's **admin-issued, not for students**:

- Base URL `https://api.managebac.com/v2`, auth via an `auth-token` request
  header. Tokens are generated by an admin at **Settings → Develop → API
  Manager → Add New Token**, with per-endpoint permissions.
- It exposes clean academic data — *Get Term Grades for a Class*, *Get
  Attendance*, *Get All Grades during a Term*, *Get Timetable for Classes*, etc.
- Docs: the Developer Portal is hosted on Postman (see links below).

A student login has none of this, which is why this repo uses the cookie
session + `events.json` feed instead. If the school admin ever issues an
`auth-token`, the tracker could switch to the official API for grades/attendance.

Reference:
- ManageBac+ Public API Developer Portal — https://schoolstech.faria.org/hc/en-us/articles/18442798523417-ManageBac-Public-API-Developer-Portal
- v2 API Authentication (`auth-token`) — https://schoolstech.faria.org/hc/en-us/articles/4830529031705-ManageBac-v2-API-Authentication
- Integrations Portal / Public REST APIs — https://guide.fariaedu.com/integrations-portal/managebac/public-rest-apis/overview

## Politeness / anti-bot

Both scripts throttle so **no two outgoing requests fire less than 1s apart**
(`THROTTLE_MS`), and send a normal desktop Chrome `User-Agent`. `login.mjs` adds
`slowMo` and human-like pauses between typing fields. Everything is **read-only**.
