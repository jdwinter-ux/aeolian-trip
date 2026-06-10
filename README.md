# Aeolian Islands Voyage Journal

A shared travel journal for the Aeolian Islands yacht charter (June 12–19, 2025).

## Features

- **Day-by-day itinerary** with timeline, activities, and meals
- **Shared notes** — all travelers can add notes to each day
- **Photo journal** with AI-powered identification (landmarks, food, places)
- **Multi-user support** via email login code (OTP) authentication
- **PWA** — add to home screen for app-like experience

## Tech Stack

- **Frontend:** Vite + React
- **Hosting:** Vercel
- **Backend:** Supabase (Postgres + Auth + Storage)
- **AI:** Anthropic Claude (photo identification)

## Local Development

1. Clone the repo:
   ```bash
   git clone https://github.com/jdwinter-ux/aeolian-trip.git
   cd aeolian-trip
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

4. Run the dev server:
   ```bash
   npm run dev
   ```

## Deployment

The app is deployed on Vercel. Any push to `main` triggers a new deployment.

### Environment Variables (set in Vercel dashboard)

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | Anthropic API key (server-side only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |

## Operating Notes

### Adding a Guest

Just share the URL. They enter their email, receive a login code by email, type it in, and they're in (login is open — no passcode). This relies on the Supabase *Confirm signup* and *Magic Link* email templates including `{{ .Token }}` — see `FORKING.md` step 5.

### Checking Usage/Costs

- **Supabase:** Dashboard → Project → Usage
- **Anthropic:** console.anthropic.com → Usage
- **Vercel:** Dashboard → Project → Usage

## Offline support

The app is a PWA with a service worker (via `vite-plugin-pwa`). After you open it
**online at least once**, it works offline:

- The full app loads (no blank screen) — itinerary, Places, and the Map route are static and always available.
- Previously-viewed notes, photos, chat history, and images render from cache.
- An "Offline" banner appears. Creating new notes/photos/chat and the AI features (Marco, photo identification) require a connection and resume when you're back online.
- Background map tiles only cover areas already viewed online; the route overlay always draws.

## Future Enhancements

- Photo editing/cropping before upload
- Export trip journal as PDF
- Offline **writes** — queue new notes/photos while offline and sync on reconnect

---

Built for the M/Y TWINS Aeolian Islands charter, June 2025.
