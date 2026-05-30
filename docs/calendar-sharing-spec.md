# Multi-account Google Calendar → single shared feed

## Context

The owner runs this app as a single-user, self-hosted tool (React 19 + Vite + tRPC +
Express, Postgres via Drizzle, `pg-boss` for cron). They want to:

1. Connect **several of their own Google accounts**.
2. Pull events from the calendars in each.
3. Merge them into **one combined iCal feed** served at a public, unguessable URL.
4. Share that URL with friends, who **subscribe to it in their own Google Calendar**
   ("Other calendars → From URL") so they can see when the owner is busy/free.

None of this exists today — there is no Google, OAuth, iCal, calendar, or public-sharing
code in the repo. The infra we reuse: **Drizzle** (token + event storage), **pg-boss**
(periodic sync), **Express** (OAuth callback + feed route + admin gate).

## Decisions (locked with the owner)

| Topic            | Decision                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Friend view      | **Full event details** (title, location, description, attendees)                                  |
| Event filter     | **Drop declined events and `Free`/transparent events**; keep the rest                             |
| Hosting          | `crm.suzuya.dev` (Coolify-deployed; **must serve HTTPS** — `http://` is rejected by Google OAuth) |
| Admin protection | **Single password gate**; only the read-only feed is public                                       |
| Sharing          | **One rotatable secret link** (`/share/:token.ics`); rotating revokes for all                     |
| OAuth            | App **published to Production**, scope `calendar.readonly` (read-only)                            |
| Window           | Rolling **−30 days … +180 days**, recurring events expanded                                       |

### Accepted limitations

- **Refresh lag is Google's, not ours.** We can serve a fresh feed every few minutes,
  but a friend's Google Calendar re-fetches an external ICS roughly **every 8–24h** and
  we cannot speed that up.
- **Full details on a forwardable link is a privacy exposure** — mitigated only by the
  rotate-link escape hatch.

## Architecture

```
Google accounts ──OAuth(calendar.readonly)──▶ tokens (encrypted, Drizzle)
                                                   │
                         pg-boss cron (*/15) ──────┤ events.list per selected calendar
                                                   ▼
                                         calendar_events (Postgres)
                                                   │
   friend's Google Calendar ──GET /share/:token.ics──▶ combined VCALENDAR (ical-generator)
```

### Data model (new Drizzle tables in `app/server/schema.ts`)

- **`google_accounts`** — `id`, `email`, `googleSub` (unique), `accessTokenEnc`,
  `refreshTokenEnc`, `tokenExpiry`, `scope`, `status`, timestamps.
- **`calendars`** — `id`, `googleAccountId` FK, `googleCalendarId`, `summary`,
  `timeZone`, `accessRole`, `selected` (bool, default true for owned), `lastSyncedAt`.
- **`calendar_events`** — `id`, `calendarId` FK, `googleEventId`, `iCalUID`, `summary`,
  `description`, `location`, `startsAt`, `endsAt`, `allDay`, `startTz`, `endTz`,
  `status`, `transparency`, `selfResponse`, `raw` (jsonb), `updatedAt`.
- **`share_settings`** — single row: `shareToken` (unique, rotatable via `nanoid`),
  `feedTitle`, `rotatedAt`.

### OAuth (official `googleapis` client)

- `GET /oauth/google/start` → consent URL with `access_type=offline`, `prompt=consent`
  (forces a refresh token every time so adding multiple accounts works), `state` (CSRF),
  scope `calendar.readonly openid email`.
- `GET /oauth/google/callback` → exchange code, read `email`/`sub`, **upsert by
  `googleSub`** so multiple accounts coexist, encrypt + store tokens, fetch the calendar
  list, insert `calendars` (owned/primary selected by default).
- Callback sits behind the admin gate; the owner's browser carries the session cookie
  through the Google redirect, so it just works.

### Token storage

AES-256-GCM at rest, key from new `ENCRYPTION_KEY` env. Decrypt only in-process.

### Sync engine (`app/jobs/syncCalendars.ts`, pg-boss cron `*/15 * * * *`)

For each **selected** calendar:

1. Refresh the access token from the stored refresh token if expired.
2. `events.list` with `singleEvents=true` (Google expands recurrences for us),
   `timeMin=now−30d`, `timeMax=now+180d`, `orderBy=startTime`, paginated.
   _Full fetch each run_ (one person's calendars are small) — avoids `syncToken`'s fixed-
   window pitfall and keeps the rolling window trivial.
3. **Drop** events where `self.responseStatus === 'declined'`, where
   `transparency === 'transparent'` (Free), and `status === 'cancelled'`.
4. Replace this calendar's stored events; stamp `lastSyncedAt`.
   Plus a manual **"Sync now"** trigger from the UI.

### Feed (`GET /share/:token.ics`, public, no auth)

- 404 unless `:token` matches `share_settings.shareToken`.
- Build a `VCALENDAR` with **`ical-generator`**: one `VEVENT` per stored event, stable
  `UID` = `iCalUID`, correct `DTSTART/DTEND` with `TZID` + `VTIMEZONE` (timezone correctness
  is the main ICS footgun → rely on the library), all-day events as `DATE` values, full
  `SUMMARY/LOCATION/DESCRIPTION`. Set `X-WR-CALNAME`, `REFRESH-INTERVAL`, `X-PUBLISHED-TTL`
  (Google mostly ignores these but they're correct to send).
- `Content-Type: text/calendar; charset=utf-8`, short cache header.

### Admin gate (Express middleware + tRPC `protectedProcedure`)

- New `ADMIN_PASSWORD` env. `POST /admin/login` sets a signed, httpOnly session cookie.
- Middleware guards everything **except** `/share/:token.ics`, `/api/health`, and login
  assets. tRPC procedures move from `publicProcedure` to a session-checked
  `protectedProcedure`.

### Admin UI (new route under `app/routes`, e.g. `settings.calendar.tsx`)

- Login screen when unauthenticated.
- **Connected accounts**: list (email, status), "Connect another account", "Disconnect".
- **Calendars** per account: checkboxes → `selected`.
- **Share link**: current feed URL + copy button, **"Rotate link"**, editable feed title,
  short "how friends add this in Google Calendar" note.
- **Sync status**: last-sync time + "Sync now".

### New env vars

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_URL` (the domain),
`ADMIN_PASSWORD`, `SESSION_SECRET`, `ENCRYPTION_KEY`. (Redirect URI derived as
`${PUBLIC_URL}/oauth/google/callback`.)

### New dependencies

`googleapis` (OAuth + Calendar API, handles token refresh), `ical-generator`
(+ a tz helper if the lib needs one), `nanoid` (already transitively present) for tokens.

## Google Cloud setup (project `personal-crm-497916`, done via Chrome)

1. Enable **Google Calendar API**.
2. **OAuth consent screen**: External; app name; support email; scopes
   `calendar.readonly`, `openid`, `email`; **Publish to Production** (so refresh tokens
   don't expire weekly — the "unverified" warning is a one-time click for your own accounts).
3. **OAuth client ID** (Web application): authorized redirect URI
   `https://crm.suzuya.dev/oauth/google/callback`, JS origin `https://crm.suzuya.dev`.
4. Hand the **client ID** to config; **client secret** pasted by the owner into env
   (never stored in chat).

## Verification

1. Connect 2+ Google accounts → both appear with their calendars.
2. "Sync now" → confirm rows in `calendar_events`; spot-check a declined and a Free event
   are **absent**, a recurring series is **expanded**.
3. Open `https://crm.suzuya.dev/share/<token>.ics` in a browser → validate it parses; import via
   Google Calendar "From URL" in a throwaway account and confirm events + timezones render.
4. **Rotate link** → old URL 404s, new one works.
5. Hit an admin route logged-out → blocked; hit the feed logged-out → works.

## Build order

1. Schema + migration. 2. Encryption + session/auth gate. 3. OAuth connect flow + account/
   calendar UI. 4. Sync job. 5. Feed route + ICS generation. 6. Share-link UI + rotation.
2. Google Cloud config. 8. End-to-end verification.
