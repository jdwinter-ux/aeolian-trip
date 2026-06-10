# Progress Log

Running log of work on the Aeolian Islands Voyage Journal. Newest session first.

---

## Session — 2026-06-10 (login overhaul + go-live prep)

Applied to **both** this app and the Corsica & Nice app (kept in sync).

### Completed this session
- **Login redesigned: shared passcode + magic link → email + in-app OTP code.** `LoginScreen.jsx` now does email → `signInWithOtp` → enter code → `verifyOtp` (no leaving the app, which fixes the mobile browser-bounce that lost sessions). Dropped `VITE_TRIP_PASSCODE` entirely (login is now open email OTP). Normalizes email (trim/lowercase) + mobile input hints.
- **Variable-length codes.** Codes accept 6–10 digits (Supabase OTP length is configurable; was emitting 8). Later set both projects to 6 in Supabase. Input/validation no longer hardcode length.
- **Custom SMTP (SendGrid).** Replaced Supabase's built-in sender (~2 emails/hour cap) with SendGrid SMTP, then raised the auth email rate limit. Documented in `FORKING.md`.
- **Chat reset for go-live.** Added `scripts/reset-chat.mjs` (service_role; deletes `trip_chat` rows + empties `chat-attachments`, paginated). Cleared this project's test data: **40 messages + 14 attachment files**.
- **Quality pass:** merged Supabase's conflated expired/invalid OTP error into one accurate message; `htmlFor`/`id` on inputs; doc fixes (env-var count, stale "magic link"/passcode references).

### Requires manual Supabase config (per project, not in code)
- **Email templates must include `{{ .Token }}`** in **both** *Confirm signup* (new users) and *Magic Link* (returning users), or the code-less email breaks login.
- Custom SMTP settings + raised rate limit live in the dashboard, not the repo.

### Incomplete / caveats
- **Rotate this project's `service_role` key** — it was pasted into a chat transcript during the reset. Then update it in Vercel.

---

## Session — 2026-06-05 (robustness pass — offline photos)

### Completed this session
- Reviewed Phase 3b and fixed the two real issues:
  - **Object-URL side effects moved out of `setPhotos` updaters** (`fetchPhotos`, realtime `onInsert`) — they now run as plain side effects via a `photosRef` snapshot, fixing a StrictMode dev blob-URL leak and shrinking reconnect-race windows; updaters are pure.
  - **Pending badge could stick if the realtime echo was missed** — `flushPhotos` dispatches a `photos-synced` event; PhotosTab refetches on it so a synced photo reconciles regardless of echo timing.

### Working / tested
- `npm run build` clean (SW emitted); `npm test` 8/8; no new lint rule types. Frontend-only.

### Incomplete / buggy / caveats
- Acknowledged (narrow / unlikely with our permissive RLS + simple schema): a persistently-failing insert would re-upload the blob / could clobber via `upsert:true`; multi-tab concurrent flush double-identifies; quota eviction is silent; brief storage-propagation image flash on sync.

### Tackle next time
- PDF export; missing PWA icon PNGs; optional Travelers-headshot offline support.

---

## Session — 2026-06-05 (Phase 3b — offline photos)

### Completed this session
- New `src/lib/id.js` (shared `newId`, re-exported by notesQueue).
- New `src/lib/photoQueue.js` — own IndexedDB DB storing the image blob; coalesced, never-rejecting `flushPhotos` doing the idempotent 3-step sync (upload `{upsert:true}` → row `upsert(ignoreDuplicates)` → dequeue → best-effort identify) with a deterministic path `${day}/${id}.${ext}`.
- `src/App.jsx`: `flushPhotos()` on mount + reconnect; one-time `navigator.storage.persist()`.
- `src/components/PhotosTab.jsx`: client-UUID uploads; offline capture queues the file and shows it from a local object URL with a "Saved offline" badge; `fetchPhotos` restores queued photos on reload (and preserves in-flight pending); realtime `onInsert` swaps to the server row and revokes the object URL; object URLs revoked on delete/unmount; edit hidden for pending; delete dequeues pending.
- Original file is uploaded so EXIF/GPS survives for identification.

### Working / tested
- `npm run build` clean (SW emitted); `npm test` 8/8; no new lint rule types. No DB migration, no new dependency.
- Full E2E needs a browser (IndexedDB + offline) — verify on deploy.

### Incomplete / buggy / caveats
- Storage quota: many large blobs could exceed IndexedDB; `queuePhoto` surfaces failures, `persist()` reduces eviction, but no downscaling (kept originals for EXIF).
- Offline delete of an already-synced photo still relies on reconnect; offline Travelers headshots not covered.

### Tackle next time
- PDF export; missing PWA icon PNGs; optional Travelers-headshot offline support.

---

## Session — 2026-06-05 (robustness pass — offline notes)

### Completed this session
- Reviewed the offline-notes queue + reconnect code and hardened it:
  - `flushNotes` is **coalesced** (one in-flight run; mount + reconnect can't double-process) and wraps each upsert so it **never rejects** (no unhandled rejections from fire-and-forget calls).
  - `deleteNote` now **awaits** the dequeue before the server delete (a pending note deleted right before reconnect can't be re-synced).
  - `fetchNotes` **preserves the current day's still-pending notes** during its merge (day-filtered) so a concurrent refetch can't drop an optimistic note.
  - `openDB` got an `onblocked` handler (won't hang on a blocked open).

### Working / tested
- `npm run build` clean (SW emitted); `npm test` 8/8; no new lint rule types. Frontend-only.

### Incomplete / buggy / caveats
- Acknowledged (not fixed): upsert-succeeds-but-dequeue-fails re-sends harmlessly (idempotent); ChatTab `_error`-clobber and identical-message collapse are pre-existing edges; offline delete of an already-synced note still reappears on reconnect (Tier-3 limit).

### Tackle next time
- Phase 3b (offline photos); PDF export; photo cropping; missing PWA icon PNGs.

---

## Session — 2026-06-05 (Phase 3a — offline notes)

### Completed this session
- New `src/lib/notesQueue.js` — dependency-free IndexedDB queue (`queueNote`, `getQueuedNotesForDay`, `unqueueNote`, `flushNotes`, `newId`). Sync is idempotent via client-generated UUID + `upsert(..., { onConflict: 'id', ignoreDuplicates: true })`; guards for missing IndexedDB/crypto.
- `src/App.jsx` flushes the queue on mount (with session) and on reconnect.
- `src/components/PlacesTab.jsx`: `saveNote` queues offline (with a "⏳ Saving — syncs when online" badge), `fetchNotes` merges still-queued notes (survives reload), realtime `onInsert` upserts to clear the badge on sync, `deleteNote` handles pending notes.

### Working / tested
- `npm run build` clean (SW emitted); `npm test` 8/8; no new lint rule types. No DB migration, no new dependency.
- Full E2E needs a browser (IndexedDB + offline toggle) — verify on deploy.

### Incomplete / buggy / caveats
- Offline **deletion of an already-synced** note can't reach the server until reconnect (it reappears on refetch) — only note *creation* is fully offline.
- No automated test for the IndexedDB queue (would need `fake-indexeddb`); covered by manual E2E.

### Tackle next time
- Phase 3b (offline photos — the heavy half); PDF export; photo cropping; missing PWA icon PNGs.

---

## Session — 2026-06-05 (refetch on reconnect)

### Completed this session
- New `src/lib/useOnReconnect.js` hook (ref-stable `window 'online'` listener).
- Wired refetch-on-reconnect into the data spots so events missed during a realtime disconnect are recovered automatically:
  - `App.jsx` → header photo count; `PlacesTab.jsx` → day notes; `PhotosTab.jsx` → day photos.
  - `ChatTab.jsx` → re-fetches chat history and **merges** via existing `mergeMessage` (no loading flash; optimistic/local messages preserved).

### Working / tested
- `npm run build` clean (SW intact); `npm test` 8/8; no new lint rule types. Frontend-only (no `api/` changes).

### Incomplete / buggy / caveats
- Keys off `navigator.onLine` flipping false→true, so it recovers from a real disconnect→reconnect; it won't fire on dead-uplink wifi where `onLine` never changed (that case is covered by the write-error feedback added previously).
- `useOnReconnect` has no unit test (would need jsdom; current vitest runs in node env).

### Tackle next time
- Tier 3 offline writes (queue + sync); PDF export; photo cropping; missing PWA icon PNGs.

---

## Session — 2026-06-01 (robustness review #2)

### Completed this session
- Reviewed the offline/PWA work + previously-unscrutinized areas (login, supabase client, notes) and fixed:
  - **PlacesTab notes** now surface errors (`saveNote`/`deleteNote`/`fetchNotes`) instead of silently failing, and use functional state updates.
  - **Logout clears the `supabase-rest` / `supabase-images` SW caches** so cached trip data isn't served to the next user on a shared device.
  - **LoginScreen**: fail closed if `VITE_TRIP_PASSCODE` is empty (no blank-passcode bypass); stronger email validation.
  - **`supabase.js`**: clear error if `VITE_SUPABASE_URL`/`ANON_KEY` are missing (instead of a cryptic crash).
  - **`fetchTotalPhotos`**: wrapped so it doesn't throw an unhandled rejection offline.

### Working / tested
- `npm run build` clean (SW still emitted); `npm test` 8/8; no new lint rule types. Frontend-only (no `api/` changes).

### Incomplete / buggy / caveats
- `navigator.onLine` can be a false positive on dead-uplink wifi; mitigated now by visible write-error feedback, but the banner may not appear in that case.
- Realtime does not refetch events missed during a disconnect (inherent to fetch-on-mount) — a "refetch on reconnect" would close this.

### Tackle next time
- Optional: refetch notes/photos/count on `window 'online'` to recover from realtime gaps.
- Tier 3 offline writes; PDF export; photo cropping; missing PWA icon PNGs.

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
