# Order Tracker

A self-hosted dashboard that turns retailer order emails into a live order tracker. It connects to your inbox over IMAP, parses order confirmation / shipping / delivery emails, and gives you a dashboard with order status, a delivery calendar, analytics, an inventory & P&L log, and optional Discord notifications.

## Features

- **Email-driven order tracking**: connects to any IMAP inbox (Gmail via App Password supported) and parses order emails automatically
- **Retailer parsers**: Amazon, Best Buy, Nike, Target, Pokémon Center, EB Games / GameStop, Walmart, plus a generic fallback
- **Dashboard**: order stepper with status history (pending, confirmed, shipped, delivered, plus cancellations and exceptions)
- **Delivery calendar**: see what arrives when
- **Analytics**: spending and order charts
- **Inventory & P&L**: log unit cost / sale price per item and track profit
- **Discord integration**: webhook notifications and optional slash commands via a Discord bot
- **Background sync**: [Inngest](https://www.inngest.com/) workflows poll your inboxes on a schedule
- **Mock inbox**: a built-in mock email provider so you can try everything without connecting a real inbox
- **Private by default**: Google sign-in (via Supabase Auth) restricted to an allowlist; add one or several Google accounts via `ALLOWED_EMAILS`

## Tech stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · Inngest · Tailwind CSS 4 + shadcn/ui · ImapFlow + mailparser + cheerio

## Getting started

### 1. Clone and install

```bash
git clone <your-fork-url>
cd ordertracker
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run the contents of [`schema.sql`](schema.sql) to create the tables.
3. In **Authentication → Providers**, enable **Google** and configure it with OAuth credentials from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`).

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `ALLOWED_EMAILS` | ✅ | Comma-separated Google account emails allowed to sign in, e.g. `you@gmail.com,partner@gmail.com`. Use `*` to allow any Google account (not recommended). If empty, **nobody** can sign in. |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | Lets background Inngest workers bypass Row Level Security |
| `INNGEST_DEV` | ⬜ | Set to `1` for local development |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | ⬜ | Only needed for hosted Inngest in production |
| `DISCORD_APPLICATION_ID` / `DISCORD_PUBLIC_KEY` / `DISCORD_BOT_TOKEN` | ⬜ | Only needed for Discord slash commands |

### 4. Run it

Start the dev server and the Inngest dev server (two terminals):

```bash
npm run dev
```

```bash
npx inngest-cli@latest dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google. Any account listed in `ALLOWED_EMAILS` can sign in, so you can share the dashboard with multiple people by listing their emails.

### 5. Connect your inboxes

Go to **Settings** in the app. You can connect as many email accounts as you want, and orders from all of them show up in the same dashboard:

- **Mock account**: a demo account is seeded by `schema.sql`, so you can trigger a sync and watch fake orders flow in immediately.
- **Gmail**: enable 2-Step Verification on your Google account, create an [App Password](https://myaccount.google.com/apppasswords), and connect with host `imap.gmail.com`, port `993`.
- **Any IMAP provider**: enter your own host/port/password.

You can also set a **Discord webhook URL** in Settings. One webhook covers everything: order notifications from all connected inboxes are sent to it.

## Optional: Discord slash commands

1. Create an application at the [Discord Developer Portal](https://discord.com/developers/applications) and fill in the `DISCORD_*` variables in `.env`.
2. Register the commands:

```bash
node scripts/register-discord-commands.mjs
```

3. Point the application's **Interactions Endpoint URL** at `https://<your-domain>/api/discord/interactions`.

## Deploy for free (Vercel + Supabase + Inngest)

The whole stack runs on free tiers: Vercel Hobby for hosting, Supabase Free for the database and auth, Inngest's free plan for background sync.

### 1. Supabase (you already have this from local setup)

Your existing Supabase project works as-is. Just allow your production URL in **Authentication > URL Configuration**:

- Set **Site URL** to `https://<your-app>.vercel.app`
- Add `https://<your-app>.vercel.app/auth/callback` to **Redirect URLs**

(You can do this after the first Vercel deploy, once you know the URL.)

### 2. Vercel

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com), click **Add New > Project** and import the repo. Vercel detects Next.js automatically.
3. Under **Environment Variables**, add:
   - `ALLOWED_EMAILS`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - the `DISCORD_*` variables if you use the bot
   - do NOT set `INNGEST_DEV` in production
4. Deploy, then complete step 1 above with your new URL.

### 3. Inngest

Easiest path is the official integration:

1. Create a free account at [app.inngest.com](https://app.inngest.com).
2. Install the [Inngest Vercel integration](https://vercel.com/integrations/inngest) and connect it to your project. It sets `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` on Vercel and syncs your app automatically on each deploy.
3. Redeploy once so the new env vars take effect.

Manual alternative: create the event key and signing key in the Inngest dashboard, add them as Vercel env vars, redeploy, then in Inngest go to **Apps > Sync new app** and enter `https://<your-app>.vercel.app/api/inngest`.

Background sync then runs automatically every 30 minutes (the `sync-all-accounts` function has a cron trigger). You can also trigger a sync manually from the app or by hitting `GET /api/sync/cron`.

### 4. Discord bot (optional)

Set the application's **Interactions Endpoint URL** to `https://<your-app>.vercel.app/api/discord/interactions` in the Discord Developer Portal.

## Project structure

```
src/
  app/              # Pages: dashboard, calendar, analytics, inventory, settings, login
  app/api/          # API routes: orders, accounts, inventory, sync, settings, discord, inngest
  app/auth/         # Google OAuth callback (allowlist enforced here)
  proxy.ts          # Auth guard for all non-public routes (Next.js proxy, ex-middleware)
  lib/mail/         # Email parsers per retailer + mock inbox
  lib/inngest/      # Background sync workflows
  lib/carrier/      # Carrier status + tracking links
  lib/supabase/     # Supabase client/server helpers
schema.sql          # Database schema (run in Supabase SQL editor)
```

## Security notes

- Sign-in is allowlist-only, enforced both in the OAuth callback and in the request proxy. With `ALLOWED_EMAILS` unset the app fails closed.
- IMAP credentials are stored in the `email_accounts` table in your Supabase project. Keep your project keys private and never commit `.env`.

## License

MIT
