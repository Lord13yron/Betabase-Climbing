# Betabase — Build Plan & Progress

> **Single source of truth for the build.** Work one step at a time, ideally one per session.
> Per-session ritual: read this file → implement the **next unchecked step** below → verify it against the step's gate → check its box in the Progress list → commit. Do not start a later step until the current one passes.

## Progress

- [x] **Step 0** — Cross-session tracking setup
- [x] **Step 1** — Supabase wiring
- [x] **Step 2** — Auth + profiles
- [x] **Step 3** — Gyms schema + RLS + admin/manager roles
- [x] **Step 4** — Gyms list page + search
- [x] **Step 5** — Walls + routes schema + RLS + grades lib
- [ ] **Step 6** — Gym detail page (read) + sort/filter
- [ ] **Step 7** — Manager CRUD UI
- [ ] **Step 8** — Route detail page (read)
- [ ] **Step 9** — Mux upload + playback (de-risking step)
- [ ] **Step 10** — Profiles (avatar, height, max grades, view others)
- [ ] **Step 11** — Sends
- [ ] **Step 12** — Favorites
- [ ] **Step 13** — Comments

---

## Context

Betabase is a web app (mobile + desktop) for climbing gyms. Climbers find their gym, browse its routes, and watch/upload short **beta videos** to learn how to send a climb. It also supports logging sends, favoriting, commenting, and user profiles.

The repo is a bare Next.js 16.2.6 + React 19 + Tailwind v4 scaffold (no Supabase yet). This plan captures the design decisions resolved in a grilling session and sequences the build. **Phase 1 proves the core loop** (find gym → find route → watch/upload beta) end-to-end and de-risks the Mux integration early; **Phase 2** layers social features.

> ⚠️ Per `AGENTS.md`, this is a non-standard Next.js with breaking changes. **Before writing any code**, read `node_modules/next/dist/docs/01-app/01-getting-started/` and `03-api-reference/03-file-conventions/` (esp. `route.ts`, `page.tsx`, Server Actions, metadata). Heed deprecation notices.

## Decisions (locked)

| Area | Decision |
|---|---|
| Content model | **Hybrid**: admins create gym shells; a gym is managed by an admin-assigned **gym manager** who maintains its routes. Regular users add videos/sends/comments/favorites. |
| Route lifecycle | **Hard delete** on reset. No archive/soft-delete state. |
| Sends | **Die with the route** (FK cascade). No long-term send history; sends reflect currently-set routes only. |
| Disciplines | **Boulder (V-scale) + roped (YDS 5.x)**. Route `discipline` = boulder / top_rope / lead. |
| Video | **Mux**: direct upload → transcode → HLS playback + thumbnails. |
| Gym claiming | **Admin-assigned manually** (insert `gym_managers` rows via Supabase dashboard). No claim UI in MVP. |
| Auth | Supabase **email/password + Google OAuth**. |
| Profile | avatar (Supabase Storage) + unique username + height (store cm, ft/in display toggle) + self-reported **max boulder (V)** and **max route (YDS)**. |
| Walls | **Per-gym `walls` table**; routes reference a wall via dropdown. |
| Comments | **Flat**, on **both routes and videos**. Author/manager/admin can delete. |
| Gym search | **Text search by name + city**. No geo. |

Consequence to accept: because routes hard-delete and sends/favorited-climbs are FK to routes, a wall reset wipes those rows. This is intended.

## Data model (Supabase / Postgres)

- **profiles** — `id` (=auth.users.id), `username` (unique), `avatar_url`, `height_cm`, `max_boulder_grade`, `max_route_grade`, `is_admin` (bool), `created_at`.
- **gyms** — `id`, `name`, `city`, `address`, `created_at`. Text search over `name`/`city`.
- **gym_managers** — (`gym_id`, `user_id`) composite PK. Defines who manages what.
- **walls** — `id`, `gym_id`, `name`, `sort_order`.
- **routes** — `id`, `gym_id`, `wall_id` (nullable), `name`, `discipline` (enum: boulder|top_rope|lead), `color`, `grade_label` (e.g. "V5" / "5.11c"), `grade_order` (int, for cross-row sorting within a system), `set_date`, `created_at`.
- **videos** — `id`, `route_id` (cascade), `uploader_id`, `mux_upload_id`, `mux_asset_id`, `mux_playback_id`, `status` (pending|ready|errored), `caption` (nullable), `created_at`.
- **sends** — `id`, `route_id` (cascade), `user_id`, `sent_at`. Unique (`route_id`,`user_id`).
- **favorite_gyms** — (`user_id`, `gym_id`). **favorite_routes** — (`user_id`, `route_id`, cascade).
- **comments** — `id`, `user_id`, `route_id` (nullable), `video_id` (nullable), `body`, `created_at`. CHECK exactly one of route_id/video_id is set.

Grade ordering: a small `lib/grades.ts` constant maps label ↔ `grade_order` per system (V0–V17; YDS 5.0–5.15). Discipline determines which system applies.

### RLS policies (enforce roles in DB, not just UI)
- profiles: public read; user updates own row.
- gyms: public read; write by admin only.
- walls + routes: public read; insert/update/delete by a `gym_managers` member for that `gym_id` **or** admin.
- videos: public read; insert by any authenticated user; delete by uploader / gym manager / admin.
- sends + favorites: user reads/writes own rows.
- comments: public read; insert authenticated; delete by author / gym manager / admin.

## Mux video pipeline

Deps: `@mux/mux-node` (server), `@mux/mux-player-react`, `@mux/mux-uploader-react`.

1. **Get upload URL** — Route Handler `app/api/mux/upload/route.ts` (authed): create a Mux Direct Upload, insert a `videos` row (status `pending`, store `mux_upload_id`, `route_id`, `uploader_id`), return the upload URL.
2. **Upload** — client uses `<MuxUploader>` to push the file straight to Mux.
3. **Webhook** — `app/api/mux/webhook/route.ts`: verify Mux signature, handle `video.asset.ready` → set `mux_asset_id`, `mux_playback_id`, `status=ready` on the row keyed by `upload_id` (uses Supabase **service-role** client). Handle `errored` too.
4. **Playback** — `<MuxPlayer playbackId=…>`; thumbnails via `image.mux.com/{playbackId}/thumbnail.jpg`.

## Architecture & structure

Follow the **existing scaffold**: App Router with `app/` at repo root (note: `CLAUDE.md` mentions `src/` — the scaffold doesn't use it; stay consistent with the scaffold and put `lib/` and `components/` at root). Use Server Components for reads (server-side Supabase client) and Server Actions or Route Handlers for mutations.

- `lib/supabase/server.ts`, `lib/supabase/client.ts` (via `@supabase/ssr`), `lib/mux.ts`, `lib/grades.ts`
- `app/(auth)/login`, `app/(auth)/signup`
- `app/page.tsx` (home), `app/gyms/page.tsx` (list + search)
- `app/gyms/[gymId]/page.tsx` (gym detail: routes list with grade/color/type/wall filters + sort; manager controls for walls/routes)
- `app/routes/[routeId]/page.tsx` (route info + beta videos + upload + comments)
- `app/u/[username]/page.tsx` (profile — Phase 2)
- `app/api/mux/upload/route.ts`, `app/api/mux/webhook/route.ts`
- `components/` — gym card, route row, filter bar, video player, uploader, comment list, etc.

Deps to add: `@supabase/supabase-js`, `@supabase/ssr`, `@mux/mux-node`, `@mux/mux-player-react`, `@mux/mux-uploader-react`.

Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`.

---

## Steps

### Phase 1 — Core loop

**Step 0 — Cross-session tracking setup** ✅
Write `docs/BUILD_PLAN.md` (this plan + progress checklist), add the pointer block to `CLAUDE.md`, commit.
*Verify:* `docs/BUILD_PLAN.md` exists with the checklist; `CLAUDE.md` references it; changes committed.

**Step 1 — Supabase wiring**
Install `@supabase/supabase-js` + `@supabase/ssr`; add `lib/supabase/server.ts` + `client.ts`; create `.env.local`.
*Verify:* a server component runs a trivial Supabase query with no error; `npm run build` passes.

**Step 2 — Auth + profiles** ✅
Email/password + Google login/signup pages, auth callback route, `profiles` table, and row creation on signup (username required).
*Verify:* sign up via email and via Google; a `profiles` row appears; log out/in works.

**Step 3 — Gyms schema + RLS + admin/manager roles**
Migration for `gyms`, `gym_managers`, `profiles.is_admin`; RLS (public read, admin-only gym writes). Manually seed one gym + assign yourself manager via the dashboard.
*Verify:* gyms query returns the seed row; a non-admin write is rejected by RLS.

**Step 4 — Gyms list page + search**
`app/gyms/page.tsx`: list gyms with name/city text search.
*Verify:* search filters the list correctly.

**Step 5 — Walls + routes schema + RLS + grades lib**
`walls`, `routes` tables, `lib/grades.ts` (V-scale + YDS label↔order); RLS so only that gym's manager/admin can write.
*Verify:* as manager, insert a wall + a boulder (V) and roped (YDS) route; a non-manager write is rejected.

**Step 6 — Gym detail page (read) + sort/filter**
`app/gyms/[gymId]/page.tsx`: route list with sort/filter by grade, color, discipline(type), wall.
*Verify:* each sort/filter axis behaves correctly.

**Step 7 — Manager CRUD UI**
Manager-only controls on the gym page to add walls and create/edit/delete routes.
*Verify:* manager can CRUD; a regular user sees no controls and RLS blocks direct writes.

**Step 8 — Route detail page (read)**
`app/routes/[routeId]/page.tsx`: route info + empty video gallery + comments placeholder.
*Verify:* page renders correct route info.

**Step 9 — Mux upload + playback (the de-risking step)**
`videos` table, `lib/mux.ts`, `app/api/mux/upload/route.ts`, `app/api/mux/webhook/route.ts`, `<MuxUploader>` + `<MuxPlayer>` on the route page.
*Verify:* upload a phone clip (ideally an HEVC iPhone video); the `videos` row flips `pending → ready` via webhook and the clip **plays in both Safari and Chrome**. This is the whole reason for Mux — confirm before declaring Phase 1 done.

### Phase 2 — Social (each its own step, one at a time)

**Step 10 — Profiles:** avatar upload (Storage), height ft/in toggle, max boulder/route grades, view other users' profiles.
**Step 11 — Sends:** tick/untick a send on a live route; show on profile.
**Step 12 — Favorites:** favorite gyms + routes; a favorites view.
**Step 13 — Comments:** flat comments on routes and videos; author/manager/admin delete (verify RLS blocks deleting others').
