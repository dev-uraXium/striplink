# StripLink

StripLink is a real-time flight strip platform for Project Flight ATC. Controllers run a session per airport; pilots file flight plans through a submit link **or a Google Form**, and the strips appear live on everyone's board.

StripLink is a fork of [PFControl v2](https://github.com/cephie-studios/pfcontrol-2) by Cephie Studios, licensed AGPL-3.0. Almost everything is PFControl's work; see [What's different](#whats-different) and `NOTICE.md`.

## Run it locally (Windows)

You need **Node 22** and **Docker Desktop** (running).

1. Double-click **`dev.bat`**. It starts Postgres and Redis in Docker, creates `.env.development` with fresh secrets, installs packages and starts the site.
2. Your browser opens http://localhost:5173/login. Type any name in **Dev login**.
3. Create a session, open it, then **Settings → Google Form → Turn on** and **Send a test flight**.

The first run takes a few minutes (package install and Docker images). Stop everything by closing the window; stop the databases with `docker compose -f docker-compose.dev.yml down`.

### Manual setup (any OS)

```bash
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis
cp .env.example .env.development                 # fill in the secrets, set DEV_LOGIN=true
npm install
npm run dev                                      # web :5173, API :9901
```

Dev login only works when `NODE_ENV` isn't `production`. For real sign-in, create a Discord app (https://discord.com/developers/applications → OAuth2), add `http://localhost:9901/api/auth/discord/callback` as a redirect, and set `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`. Put your Discord user ID in `ADMIN_IDS` to get the admin panel.

## Google Forms

Each session can take flight plans from a Google Form. Only the session owner can set it up.

1. On the board: **Settings → Google Form → Turn on Google Form intake**.
2. Click **Copy Apps Script**. It already contains the session's webhook URL and secret.
3. In Google Forms: **⋮ → Apps Script**, replace the code with it. Optionally run `buildFlightPlanForm` on an empty form to add the questions (with Project Flight airport dropdowns).
4. Run `installTrigger` once and approve Google's permissions, then `sendTestFlight`.

Every response is filed through the same path as the submit page, so it gets a squawk, wake category, runway and SID automatically, shows up live, and carries a small **FORM** tag. Duplicate deliveries of a response are ignored.

Recognised question titles (case and punctuation don't matter): Callsign, Aircraft, Flight rules, Departure, Arrival, Alternate, Cruising level, Route, Stand, Gate, Remarks, Roblox username, Pilot. Other answers are added to the strip's remarks. Aliases live in `server/forms/fieldMap.ts`.

Google can't reach `localhost`, so real form responses only arrive once StripLink is hosted (or behind a tunnel such as `cloudflared`). **Send a test flight** works locally.

**Can't add a script to the form?** Set `GOOGLE_SERVICE_ACCOUNT_JSON` (a service account with the Google Forms API enabled). The setup panel then shows the service account's email; share the form with it and paste the form's editor link. StripLink polls it every `FORMS_POLL_INTERVAL` seconds.

Webhook API, if you want to send from something else:

```
POST /api/forms/webhook/<sessionId>
X-StripLink-Secret: <secret from the setup panel>
{ "responseId": "optional-unique-id", "answers": { "Callsign": "BAW123", "Aircraft": "A320", ... } }
```

## What's different

Compared to PFControl:

- **Google Forms intake** (above): `server/forms/`, `server/routes/forms.ts`, `src/components/modals/GoogleFormModal.tsx`.
- **No billing.** Stripe, pricing, gifting, supporter plans/badges/wall and the admin billing page are gone. Everyone gets every feature (`server/billing/entitlements.ts` always grants the top plan).
- **Rebranded** to StripLink with its own mark and icons. Your links (Discord, support email, GitHub, legal pages, owner) are set in `.env.vite.*` (`VITE_DISCORD_URL`, `VITE_SUPPORT_EMAIL`, …) and hidden when empty; see `src/brand.ts`.
- **Simpler pilot profile**: no supporter rings/badges or featured flights. The Photos tab only shows when a flight has photos (uploads need Cephie's image API).
- **Self-hosting fixes**: allowed origins come from `FRONTEND_URL` (+ `EXTRA_ORIGINS`) instead of a hardcoded domain; "production" is whatever host `FRONTEND_URL` / `VITE_SERVER_URL` points at; the tester gate is off by default.
- **Removed Cephie-specific things**: their PostHog analytics key, Google AdSense account, research survey, deploy workflows, status badge and team photos.
- **Dev login** (`DEV_LOGIN=true`) for local testing without a Discord app.

Optional integrations still work if you supply your own keys: ChartFox, VATSIM, Roblox, PostHog, Resend, Cloudflare TURN. Cephie Charts and Cephie Snap photo uploads need Cephie's APIs and stay hidden without them.

## Deploying

### Free: Cloudflare Worker + Render + Neon (what striplink.dev-uraxium.workers.dev runs on)

```
browser ──► Cloudflare Worker (cloudflare/worker.js) ──► Render web service (Docker) ──► Neon Postgres
            same-domain proxy, WebSockets,                 + Render Key Value (Redis)
            edge cache, keep-alive cron
```

1. **Neon** → new project → *Connect* → copy the **pooled** connection string. Tables are created on first boot.
2. **Render** → *New → Blueprint* → pick this repo. `render.yaml` creates the web service and a free Key Value (Redis). Fill in:
   - `FRONTEND_URL` and `PUBLIC_API_URL` = your Worker URL, e.g. `https://striplink.<subdomain>.workers.dev`
   - `POSTGRES_DB_URL` = the Neon string
   - `DB_ENCRYPTION_KEY` = `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - `PROXY_SECRET` = any long random string (also goes on the Worker)
   - `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI` = `<FRONTEND_URL>/api/auth/discord/callback` (add the same URL in the Discord developer portal → OAuth2 → Redirects)
   - `ADMIN_IDS` = your Discord user id
3. **Cloudflare** → Workers & Pages → *Create → Import a repository* → this repo, root directory `cloudflare`. Then on the Worker → Settings: variable `ORIGIN` = your Render URL, secret `PROXY_SECRET` = same as on Render. `wrangler.toml` adds a 10-minute cron that keeps Render awake.
4. If your Worker URL differs, change `VITE_SERVER_URL` / `PUBLIC_SITE_URL` in `.env.vite.production` and push (the frontend bakes it in at build time).

The keep-alive cron uses ~730 of Render's 750 free instance hours a month, so run only one free Render service. Neon scales to zero when idle and wakes in under a second.

### Anywhere else (Docker)

Put your public URL in `.env.vite.production` (`VITE_SERVER_URL`, `PUBLIC_SITE_URL`), create `.env.production` from `.env.example` (Postgres, Redis, secrets, Discord, `FRONTEND_URL` = the same public URL), then `docker compose up -d --build`. Add `<url>/api/auth/discord/callback` to your Discord app.

Without Docker: copy the `VITE_*` lines from `.env.vite.production` into `.env.production`, then `npm run build` and `npm run prod`.

## License

AGPL-3.0 (see `LICENSE`), inherited from PFControl. If you run StripLink for other people you must offer them the source of the version you run. Set `VITE_GITHUB_URL` and the footer links to it.
