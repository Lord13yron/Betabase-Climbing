# Betabase Mobile — Build Plan & Progress (React Native + Expo)

> **Single source of truth for the mobile build.** Work one section at a time, ideally one per session.
> Per-session ritual: read this file → implement the **next unchecked section** below → verify it against the section's gate on a real device or simulator → check its box in the Progress list → commit and push, staging only that section's files. Do not start a later section until the current one passes.

## Progress

- [x] **S0** — Expo scaffold + theme + shared libs
- [ ] **S1** — Supabase client + email auth + onboarding gate
- [ ] **S2** — EAS dev build + Google OAuth
- [ ] **S3** — Aggregate views/RPCs (SQL only)
- [ ] **S4** — Gyms directory
- [ ] **S5** — Gym detail + route browser
- [ ] **S6** — Route detail: playback, sends, favorites
- [ ] **S7** — Comments
- [ ] **S8** — Beta upload
- [ ] **S9** — Community feed + user search
- [ ] **S10** — Profiles
- [ ] **S11** — Polish pass
- [ ] **S12** — Release builds (deferred-OK)

---

## Context

The Betabase website (Next.js 16 + Supabase + Mux) is feature-complete per `docs/BUILD_PLAN.md`. This plan builds a native mobile app version with **Expo (React Native)** covering the climber-facing core: find a gym, browse its routes, watch and upload beta videos, log sends, favorite, comment, follow the community feed, and manage a profile. Gym-manager CRUD, the admin console, and marketing/legal pages stay web-only.

The app lives in a new **`mobile/`** folder in this repo as a self-contained Expo project. The website is untouched except for one endpoint change in S8. The existing web pages are the functional spec: each section below names the web files to reference for query shapes, permission rules, and UI content. **Reference them for behavior, not for markup or CSS** — all mobile UI is written natively with React Native `StyleSheet`.

Key architectural difference from the website: there are no server components or server actions in React Native. All reads and writes go **directly from the app to Supabase** with `@supabase/supabase-js` (RLS already gates everything). The only backend the app calls is the already-deployed website, for two Mux endpoints (`/api/mux/upload` to mint upload URLs; the Mux webhook stays server-side and needs no app involvement).

## Decisions (locked)

| Area | Decision |
|---|---|
| Scope | Climber core only: auth + onboarding, gyms, route browsing, playback, upload, sends, favorites, comments, community feed, profiles. No manager/admin/marketing surfaces. |
| Data layer | Direct `@supabase/supabase-js` calls under RLS. Per-gym/per-route aggregate counts move to Postgres views/RPCs (S3) instead of replicating the website's in-memory aggregation. |
| Repo layout | `mobile/` folder, self-contained Expo app (no monorepo tooling). Pure lib files are **copied** into `mobile/lib/`: `lib/grades.ts`, `lib/height.ts`, `lib/holds.ts`, the `Comment` type from `lib/comments.ts`, and the feed normalizer from `app/community/feed.ts`. |
| Auth | Email/password + Google OAuth, both in v1. Sessions persisted with the AsyncStorage adapter (official Supabase RN pattern). Google via `signInWithOAuth` + `expo-web-browser`/`expo-auth-session` deep link (scheme `betabase://`). Password reset and signup confirmation emails keep linking to the website; no in-app deep-link handling for those in v1. |
| Styling | Plain RN `StyleSheet` + `mobile/lib/theme.ts` translated from the `@theme` tokens in `app/globals.css`. Fonts via `@expo-google-fonts` (Hanken Grotesk, IBM Plex Mono, Playfair Display). No NativeWind. |
| Navigation | Expo Router (file-based). Tab bar: Gyms / Community / Upload / Profile. |
| Video playback | `expo-video` against Mux HLS: `https://stream.mux.com/{playbackId}.m3u8`. Thumbnails via `https://image.mux.com/{playbackId}/thumbnail.webp?...` rendered with `expo-image`. |
| Video upload | `expo-image-picker` (record or pick, MP4/MOV, ≤500MB) → `POST {API_BASE}/api/mux/upload` with a Supabase Bearer token → direct upload to the returned Mux URL. |
| Platforms | iOS + Android via Expo/EAS. Store submission deferred to S12. |
| Website changes | Exactly one: `app/api/mux/upload/route.ts` must also authenticate via `Authorization: Bearer <access_token>` (mobile has no cookies), then redeploy. Done inside S8. |

## Ground rules for the executing agent

- Work **only inside `mobile/`**, except where a section explicitly names a website file (S8) or a SQL migration (S3).
- Env vars in `mobile/.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL` (the deployed website origin). Same Supabase project as the website.
- SQL migrations follow the existing convention: next-numbered `supabase/migrations/00NN_description.sql`, applied manually via the Supabase dashboard SQL editor (there is no CLI-linked project).
- Match web behavior exactly for permissions (who can delete a comment/video), grade/color logic (use the copied `grades.ts`/`holds.ts`), and the onboarding gate (no app access until `profiles.username` is set).
- Keep components focused and single-purpose; TypeScript everywhere; no speculative abstractions.
- If S8's website edit is in play, heed `AGENTS.md`: read the relevant guide in `node_modules/next/dist/docs/` before touching the Next.js route handler.
- Verification is on-device: run `npx expo start` (or the EAS dev build after S2) and exercise the gate manually. Cross-check against the live website with the same account where the gate says so.

---

## Sections

### S0 — Expo scaffold + theme + shared libs

Create the Expo app and the design foundation.

- `npx create-expo-app@latest mobile` (TypeScript template with Expo Router).
- Add `mobile/lib/theme.ts`: translate the `@theme inline` tokens from `app/globals.css` (slate/chalk/plywood palette, radii, spacing scale) into a typed JS theme object.
- Load fonts with `@expo-google-fonts/hanken-grotesk`, `@expo-google-fonts/ibm-plex-mono`, `@expo-google-fonts/playfair-display` + `expo-font`; block render until loaded (splash screen).
- Copy pure libs into `mobile/lib/`: `grades.ts`, `height.ts`, and `holds.ts` (replace its CSS-variable fallbacks with hex values from the theme).
- Set up the tab navigator skeleton (Gyms / Community / Upload / Profile) with themed placeholder screens.
- Add `mobile/.env` handling and a `mobile/README.md` with run instructions.

*Verify:* app runs in Expo Go on a device; all four tabs render with the correct fonts and palette; `npx tsc --noEmit` passes in `mobile/`.

### S1 — Supabase client + email auth + onboarding gate

- `mobile/lib/supabase.ts`: `createClient` with `@react-native-async-storage/async-storage` as the auth storage, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`. Wire `AppState` to `startAutoRefresh`/`stopAutoRefresh` per Supabase RN docs.
- Auth screens (Expo Router group `mobile/app/(auth)/`): login, signup, forgot-password. Port the validation and Supabase calls from `app/(auth)/actions.ts` (signup uses email confirmation; the confirm link opens the website — that is fine, the user then logs in from the app).
- Session-aware routing: signed-out users see only `(auth)` screens; signed-in users without a `profiles.username` are locked to an onboarding screen; complete users land on the tabs. The website's redirect rules live in `lib/supabase/session.ts` — replicate the logic, not the middleware.
- Onboarding screen: claim username (port rules from `app/onboarding/actions.ts`, including case-insensitive uniqueness).

*Verify:* full loop on device — sign up, confirm via email (website opens), return to app, log in, claim username, land on tabs; force-quit and reopen: still signed in; log out returns to login.

### S2 — EAS dev build + Google OAuth

- Configure `mobile/app.json`: `scheme: "betabase"`, bundle IDs, icons placeholder.
- Set up the EAS project (`eas init`, `eas.json` with a `development` profile) and produce dev builds for iOS and Android.
- Google sign-in: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '<betabase://auth-callback>', skipBrowserRedirect: true } })` → open URL with `expo-web-browser` (`openAuthSessionAsync`) → parse the returned URL and `setSession`/`exchangeCodeForSession`. Add the `betabase://` redirect URL to the Supabase dashboard allow-list.
- Google users flow through the same onboarding gate as email users.

*Verify:* on a physical device running the dev build, Google sign-in completes end-to-end and lands on tabs (or onboarding for a fresh Google account).

### S3 — Aggregate views/RPCs (SQL only)

The website computes per-gym and per-route aggregates in memory inside server components. The app calls SQL instead. New migration `supabase/migrations/00NN_mobile_aggregates.sql`:

- View or RPC for the gyms directory: route counts per gym by discipline (reference the aggregation in `app/gyms/page.tsx`).
- View or RPC for a gym's route list: per-route beta-video count (ready only) and send count (reference `app/gyms/[gymId]/page.tsx`).
- RPC for a route's senders strip if the website builds it in memory (reference `app/routes/[routeId]/page.tsx`).
- Grant `select`/`execute` to `anon` + `authenticated`; views must respect `is_gym_visible` the same way page queries do.

*Verify:* run each view/RPC in the SQL editor against real data; counts match what the live website displays for the same gym/route.

### S4 — Gyms directory

Gyms tab (reference: `app/gyms/page.tsx`, `GymsDirectory.tsx`, `GymCard.tsx`, `GymFavoriteButton.tsx`, `app/actions/favorites.ts`).

- Search by name/city (same `.or(ilike)` shape), discipline filter, sort.
- Favorites section on top (owner-only `favorite_gyms`), heart toggle writes directly to Supabase.
- Gym cards show image, city, and the S3 route counts. Respect gym `status` visibility (live only, unless the query helpers already handle it).

*Verify:* same account shows identical gym list, favorites split, and counts as the website; toggling a favorite in the app updates the website after refresh.

### S5 — Gym detail + route browser

Gym screen (reference: `app/gyms/[gymId]/page.tsx`, `RouteBrowser.tsx`, `FavoriteHeart.tsx`).

- Hero (image, name, city), favorite toggle.
- Route list with the same filters and sorts as the web: grade (via copied `grades.ts`), hold color (via `holds.ts` swatches), discipline, wall.
- Each row shows grade label, color swatch, wall, beta count + send count from S3.

*Verify:* pick a gym with many routes; every filter/sort combination matches the website's ordering and counts.

### S6 — Route detail: playback, sends, favorites

Route screen (reference: `app/routes/[routeId]/page.tsx`, `RouteTheater.tsx`, `RouteActions.tsx`, `SendersStrip.tsx`).

- Video theater: `expo-video` player on `https://stream.mux.com/{playbackId}.m3u8`, horizontal playlist of ready videos with Mux thumbnails, uploader attribution, view counts.
- Call `increment_video_view(uuid)` RPC when a video starts playing (once per video per screen visit, matching web behavior).
- Send toggle (unique per user/route) and favorite toggle, writing directly to `sends` / `favorite_routes`.
- Senders strip from S3 data.

*Verify:* on device, an HLS beta video plays with sound and fullscreen; ticking send/favorite in the app shows up on the website route page (and vice versa); view count increments.

### S7 — Comments

Route + video comments (reference: `RouteComments.tsx`, `lib/comments.ts`, comment deletion rules in the route page's `actions.ts`).

- Copy the `Comment` type into `mobile/lib/`.
- Flat list per route and per video, newest-first to match web; composer for authenticated users.
- Delete allowed for the author (manager/admin deletion stays web-only since those roles use the website; do not build role checks in the app beyond author-own-comment).

*Verify:* comment posted in the app appears on the website without changes, and one posted on the website appears in the app; author can delete own comment in-app.

### S8 — Beta upload

The core mobile moment: film at the gym, upload from the phone.

**Website side (only web change in this plan):**
- Edit `app/api/mux/upload/route.ts` to also accept `Authorization: Bearer <access_token>`: if the header is present, build a Supabase client with that token and resolve the user from it; otherwise fall back to the existing cookie path. Keep the 10/hr/user rate limit. Read the Next.js route-handler docs per `AGENTS.md` first. Deploy before continuing.

**App side:**
- Upload tab: pick a gym → pick a route (reuse S4/S5 queries), or enter from a route screen with the route pre-selected.
- `expo-image-picker` to record a video or pick from the library (MP4/MOV, enforce ≤500MB before upload).
- `POST {EXPO_PUBLIC_API_BASE_URL}/api/mux/upload` with the session's access token + `route_id` (+ optional caption) → receive Mux direct-upload URL → upload the file with progress UI (resumable PUT per Mux direct-upload contract; `expo-file-system` upload task gives progress).
- Pending state: poll the `videos` row every ~4s (mirroring the web's refresh loop) until the webhook flips it to `ready`/`errored`; show result.

*Verify:* film a short clip on the phone, upload it from the app, watch it transition pending → ready, then play it in the app **and** on the website route page.

### S9 — Community feed + user search

Community tab (reference: `app/community/page.tsx`, `app/community/feed.ts`, `UserSearch.tsx`).

- Copy the feed normalizer from `app/community/feed.ts` into `mobile/lib/feed.ts` (it is pure).
- Rebuild its input queries client-side (videos, sends, comments, video comments, new routes at favorite gyms) and feed them through the normalizer; render the merged newest-first feed with the same event card types.
- User search by username → public profile screen (S10).

*Verify:* feed for the same account lists the same events in the same order as the website community page.

### S10 — Profiles

Profile tab + public profiles (reference: `app/profile/` incl. `ProfileEdit.tsx`, `MyVideosGrid.tsx`, `card-utils.ts`; `app/u/[username]/page.tsx`, `HeightDisplay.tsx`).

- Own profile: avatar upload to the `avatars` Storage bucket (per-user folder path, `expo-image-picker` for the photo), username display, height edit (cm stored, ft/in toggle via copied `height.ts`), max boulder (V) and max route (YDS) grade pickers from `grades.ts`, my-videos grid with Mux thumbnails and delete-own-video.
- Public profile screen at `mobile/app/u/[username]`: avatar, stats, public videos — reached from feed items, comments, senders strip, and user search.

*Verify:* change avatar/height/grades in the app → website profile reflects all three; open your own public profile from user search and confirm it matches the website's `/u/<username>`.

### S11 — Polish pass

- Pull-to-refresh on every list screen; loading skeletons/spinners; empty states with helpful copy; error states with retry (no dead ends when offline).
- App icon + splash from existing brand assets (`app/icon.png`, `public/landing/logo-mark.png`), dark-styled to match the theme.
- Final tab bar/navigation audit: back behavior on Android, safe areas, keyboard handling on forms.
- Sweep for copy style: no em dashes in user-facing text.

*Verify:* airplane-mode walk through every tab produces informative states, never a blank screen or crash; fresh install shows branded splash and icon.

### S12 — Release builds (deferred-OK)

- EAS production build profiles for iOS + Android; version/build-number scheme.
- Store metadata (name, description, screenshots), privacy declarations (camera, photo library usage strings already required earlier by `expo-image-picker`).
- TestFlight (requires Apple Developer account) and Play internal testing tracks.

*Verify:* installable production build reaches a device on both platforms via the store test tracks.
