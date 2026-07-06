# Waitlist Lab

Spin up a waitlist landing page for a new business idea in seconds, run A/B
headline tests on it, and see which marketing channels actually bring in
interested people.

## What it does

- **Admin dashboard** (`/admin`, password protected) — create a new idea with
  a name + one-line pitch and instantly get a public waitlist page at
  `/w/<slug>`.
- **A/B copy testing** — add multiple headline/subcopy/CTA variants per idea.
  Visitors are randomly (weighted) assigned a variant, consistently across
  reloads (via a cookie), and each idea's dashboard shows visits, signups, and
  conversion rate per variant.
- **Marketing channel attribution** — every waitlist link supports standard
  `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` query params.
  Tag a different link per channel (Twitter post, Instagram bio, Reddit
  comment, cold email, etc.) and the dashboard breaks down visits, signups,
  and conversion rate by channel so you can see where your actual buyers are
  coming from.
- **Signup export** — CSV export of every signup (email, name, variant,
  channel, timestamp) per idea, so you can pull the list into an email tool
  once an idea validates.

## Stack

Next.js (App Router) + Turso (SQLite-compatible, works great serverless).
No other services required. Single shared admin password (no multi-user
accounts) since this is meant for one person to quickly test many ideas.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the env file and set a password:
   ```bash
   cp .env.example .env.local
   # edit .env.local and set ADMIN_PASSWORD
   ```
   Locally, leave `TURSO_DATABASE_URL` unset — it falls back to a local
   SQLite file (`local.db`, already gitignored).
3. Run the dev server:
   ```bash
   npm run dev
   ```
4. Visit `http://localhost:3000/admin`, log in with `ADMIN_PASSWORD`, and
   create your first idea.

## Deploying (Vercel + Turso)

Plain SQLite files don't survive on serverless hosts like Vercel (the
filesystem is ephemeral/read-only between requests), so production uses
[Turso](https://turso.tech), a hosted SQLite-compatible database with a
generous free tier and a fast HTTP-based client.

1. Create a free Turso database:
   ```bash
   # https://docs.turso.tech/quickstart
   turso db create waitlist-lab
   turso db show waitlist-lab --url
   turso db tokens create waitlist-lab
   ```
2. Deploy this repo to Vercel (or any Node host) and set these environment
   variables in the project settings:
   - `ADMIN_PASSWORD` — your admin login password
   - `TURSO_DATABASE_URL` — the `libsql://...` URL from step 1
   - `TURSO_AUTH_TOKEN` — the token from step 1
   - `SESSION_SECRET` — optional, any random string (falls back to
     `ADMIN_PASSWORD` if unset)
3. Deploy. Tables are created automatically on first request — no manual
   migration step.

## Using it to test an idea

1. In `/admin`, create the idea with your pitch. This creates variant "A"
   using your pitch as the headline.
2. (Optional) Add variant "B"/"C" with different headlines or CTA text to
   see which framing converts better.
3. Share the waitlist link (`/w/<slug>`) with UTM params per channel you're
   testing, e.g.:
   - `https://yourapp.com/w/dog-walker?utm_source=twitter&utm_medium=post&utm_campaign=launch`
   - `https://yourapp.com/w/dog-walker?utm_source=reddit&utm_medium=comment&utm_campaign=r_dogs`
   - `https://yourapp.com/w/dog-walker?utm_source=friends&utm_medium=dm&utm_campaign=warm_intro`
4. Check the idea's admin page for:
   - Which variant has the highest visit → signup conversion rate
   - Which channel brought the most (and best-converting) signups
5. Export signups as CSV once you're ready to follow up with the list.
