# Progress Log

Running log of work on the Aeolian Islands Voyage Journal. Newest session first.

---

## Session — 2026-06-01 (offline support, Tier 1 + 2)

### Completed this session
- Added **`vite-plugin-pwa`** (Workbox service worker) configured in `vite.config.js`:
  - **Tier 1** — precache the app shell so the app opens offline; static tabs (Plan, Places, Map route) work fully.
  - **Tier 2** — runtime caching: Supabase REST reads `NetworkFirst` (fresh online / cached offline, 3s timeout); storage images `StaleWhileRevalidate`; map tiles + Leaflet icons `CacheFirst`.
  - Kept existing `manifest.json` (`manifest: false`).
- Added an **offline banner** in `src/App.jsx` (online/offline listener) and documented offline behavior in `README.md`.

### Working / tested
- `npm run build` emits `dist/sw.js` + `workbox-*.js` + `registerSW.js` (5 precache entries); vite-plugin-pwa 1.3.0 works with vite 8. `npm test` 8/8. No new lint errors.

### Incomplete / buggy / caveats
- Service worker is **production-only** (not in `npm run dev`); offline behavior must be tested in a real browser (DevTools → Offline) or on the deploy. Confirm `/sw.js` serves 200 post-deploy and do the load-online-then-offline check.
- Users must open the app **online once** to populate caches; background **map tiles** only cover areas already viewed.
- Offline **writes** (new note/photo/chat) and AI features remain online-only (Tier 3 not done).

### Tackle next time
- Optional **Tier 3**: queue offline note/photo creation and sync on reconnect.
- Remaining README items: PDF export, photo cropping before upload.
- Pre-existing cosmetic gap: missing PWA icon PNGs (`icon-192/512`, `apple-touch-icon`).

---

## Session — 2026-06-01 (quality & robustness pass)

### Completed this session
- Ran a 3-reviewer pass over the new feature code (photo editing, Travelers modal, reference-headshot recognition, photo-only chat, thumbnails) and applied fixes.
- **`api/chat.js` correctness:** filter empty-content rows out of replayed history and trim leading assistant messages (both caused hard Anthropic 400s that broke the thread); never store/return an empty assistant message (friendly fallback); cap the tool-use loop at 5 rounds; guard `add_traveler` against a blank name.
- **Robustness/UX:** `identify.js` error fallback includes `people: []`; `PhotosTab` edit & delete now surface errors (and delete uses a functional state update); chat image URLs are URL-encoded with an `onError` fallback; `TravelersModal` reports upload failures and rolls back orphaned uploads.
- **Maintainability:** centralized the photo-only placeholder in `src/lib/chatConstants.js` (imported by client + server) to prevent silent drift.

### Working / tested
- `npm run build` clean; `npm test` 8/8; both `api/` modules load (cross-dir imports incl. new shared constant resolve).
- No new lint rule types introduced.

### Incomplete / buggy / caveats
- Server changes (`api/chat.js`) validated only by load probe locally — confirm Marco chat end-to-end on deploy.
- Acknowledged, not fixed (low-probability / by-design): concurrent same-photo edit is last-write-wins; retry after the server already persisted a message can duplicate it; `trip_travelers` isn't in the realtime publication (modal refetches on open); `ilike` traveler-name matching uses model-controlled (trusted) input.

### Tackle next time
- Same open items as below, plus: consider adding `trip_travelers` to realtime if live roster sync becomes desirable.

---

## Session — 2026-06-01

### Completed this session
- **Restored shared notes** — merged the orphaned `LogTab` notes feature into the Places tab; removed dead `LogTab.jsx`.
- **Realtime sync** for notes, photos, and chat via a new `src/lib/useRealtime.js` hook + `supabase/migrations/20260601_enable_realtime.sql`. Hardened with 5 fixes (cross-user chat collision, fetch day-switch races, chat error-path matcher, id entropy, PlacesTab null guard) and added **vitest** with 8 unit tests for the chat merge logic (`src/lib/chatMerge.js`).
- **Fork-ready refactor** — consolidated all trip content into `src/data/` (`trip.js` + `startDate`, new `guide.js`, new `locations.js`); `api/chat.js`/`api/identify.js` now import shared modules instead of duplicating; removed dead `tripContext.js`. Full theme extraction into `src/config/theme.js` (value-preserving). Added `supabase/setup.sql` (one-shot schema) and `FORKING.md`.
- **Editable photo IDs + reference-headshot recognition + correction feedback** — inline edit form on photo cards (title/location/description/tags/category/people, sets `verified`); new `TravelersModal.jsx` (header button) to manage travelers + upload reference headshots; `api/identify.js` now feeds labeled reference faces (≤6) + recent verified photos into the prompt and returns a structured `people` array. Migration `20260601_photo_edits_and_references.sql`.
- **Photo-only chat** — can send a photo with no caption; Marco identifies/comments on it.
- **Inline chat photo thumbnails** — image attachments render as the actual (reduced-size) photo in the message and pre-send preview.

### Working / tested
- `npm run build` clean; `npm test` 8/8 passing.
- All deploys verified live (local build bundle hash == deployed; `/api/*` probes return 401 = loaded cleanly, not 500).
- User-confirmed working: notes save; realtime; photo-only chat; inline chat thumbnails.
- DB migrations applied in Supabase by the user (realtime publication; photo edit/reference columns + RLS).

### Incomplete / buggy / caveats
- **Photo ID editing + reference headshots**: deployed and load-verified, but not yet fully human-tested end-to-end (upload a headshot → confirm improved recognition).
- `npm run lint` does **not** pass project-wide — pre-existing ESLint 10 errors (accessed-before-declared, a conditional `useCallback` in PhotosTab, `no-undef` for Node globals in `api/`). Not blocking; `npm run build` is the deploy gate.
- Acknowledged low-probability realtime edges (documented, not fixed): assistant duplicate-content reconcile if `message_id` is ever missing; message re-sort on client clock skew; INSERT-after-UPDATE spinner; header photo count briefly stale during burst uploads.
- vitest pulled in dev-only `npm audit` vulnerabilities (not shipped to users).
- PWA icons referenced by `index.html`/`manifest.json` (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`) don't exist in `public/` (only `favicon.svg`) — pre-existing gap.

### Tackle next time
- Human-test photo-ID editing + reference-headshot recognition; tune the identify prompt / reference cap if recognition is still off.
- Revisit the documented realtime edge cases only if they actually surface.
- README "future enhancements" still open: **PDF export** of the journal, **offline/service-worker** support, **photo cropping** before upload.
- Optional cleanup: add the missing PWA icon assets; chip away at project-wide lint debt.

---
