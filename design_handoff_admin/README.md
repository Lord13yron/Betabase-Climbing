# Handoff: Betabase Superuser Console (`/admin`)

## Overview
This is the **superuser console** for Betabase — the internal admin surface where a
platform operator (not a gym staffer) runs the whole network. It does **three jobs**,
one per top-level view:

1. **Gyms** — the gym directory CRUD: add / edit / delete gyms, set each gym's
   **status** (Live / Draft / Archived), search and filter the list.
2. **Admins** — assign and remove **gym admins**: per-gym collapsible groups, with a
   user-search modal to grant someone admin access to a gym.
3. **Messages** — a two-pane **contact-form inbox**: read, reply (mailto), mark
   read/unread, archive, and delete messages sent through the public contact form.

It reuses the Betabase "concrete slate" visual system (dark slate ground, Playfair
Display display headings, IBM Plex Mono metadata, plywood-gold accent, climbing-hold
status colors) and borrows the Manage-Gym CRUD vocabulary (rows, collapsible groups,
modals, confirm dialog, toast).

> **Access:** this whole surface is gated to **superusers only**. The top strip shows a
> "Superuser" shield tag and the signed-in operator (`avery.kemp` in the prototype). Guard
> the route server-side — a non-superuser hitting `/admin` should be redirected / 404'd.

## About the design files
The files in `reference/` are a **design reference built in HTML/CSS/vanilla JS** — a
working prototype that shows the intended look, layout, and interaction behavior across all
three views and every modal/state. They are **not production code to ship directly**.

The target codebase is the existing **Next.js (App Router) + React + Tailwind + Supabase**
`betabase-climbing` app. The task is to **recreate this design in that environment**,
reusing its established patterns: Server Components for data fetch, Server Actions for
mutations, Tailwind (translate the tokens below into Tailwind classes / CSS vars), and
the app's existing auth + tables. Do **not** ship the raw HTML — re-implement it as React
components. The prototype's in-memory state (`admin-data.js`) stands in for real DB reads.

## Fidelity
**High-fidelity (hifi).** Colors, typography, spacing, radii, shadows, and interaction
states are final. Recreate the UI pixel-accurately using the codebase's existing
libraries. Exact token values are listed under **Design Tokens** below and live in
`reference/colors_and_type.css` (mirror of `app/globals.css`).

---

## App shell (shared across all three views)
A responsive three-tier chrome, prefix `.a-`:

- **Top strip** (sticky, 60px): brand lockup (logo mark + "Betabase") + a mono "Superuser"
  shield tag on the left; the operator chip (gold monogram avatar + username) + "Sign out"
  on the right. Translucent slate bg with `backdrop-filter: blur`.
- **Left sidebar** (244px, sticky): "Console" label + three nav items (Gyms / Admins /
  Messages). Active item gets a slate-700 fill, chalk-50 text, a **plywood-gold left
  accent bar**, and a gold-stroked icon. The Messages item carries an **unread badge**
  (gold pill, hidden at count 0). A small "Betabase v2 · Superuser console" footer sits at
  the bottom.
- **Content pane** (slate-800): one `.a-view` per nav target; only the active one is
  shown. Inner `.a-wrap` is a centered column, `max-width: 1080px` (Messages uses
  `--wide` = 1240px).

**Responsive shell** (the prototype uses width media queries; use normal breakpoints in
the app):
- **≤960px** — sidebar collapses to a **64px icon rail** (labels/footer hidden; unread
  badge floats on the Messages icon); inbox list column narrows to 320px.
- **≤760px** — gym rows reflow (see below); modal field-rows stack to one column.
- **≤640px** — sidebar is replaced by a **fixed bottom tab bar** (Gyms / Admins /
  Messages, gold active state, unread badge on Messages); the operator username + shield
  tag hide; the Messages inbox collapses to a **single pane** that swaps between list and
  reading view (a "← Back to inbox" link appears); modal footers stack full-width.
- Keep ≥44px touch targets on mobile.

---

## View 1 — Gyms

**Purpose:** the operator manages the gym directory.

**Layout (top → bottom):**
1. **Header** — eyebrow "Console", big serif title "Gyms", mono sub
   (`{n} gyms · {n} live`), and a right-aligned **"Add gym"** primary button.
2. **Hairline rule.**
3. **Toolbar** — a **search** input (by name or city) + a **segmented status filter**
   (All / Live / Draft / Archived, each with a live count).
4. **Gym rows** (`.a-rows`) — one card per gym.
5. **Empty state** (dashed panel) when no gyms match the filter/search, with an
   "Add a gym" button. Its message differs for "no gyms at all" vs. "none match".

### Gym row (`.a-gym`)
A grid: `64px cover thumb` · `name + location` · `discipline chips` · `stats` ·
`status + actions`. Background slate-700, hairline border, `--radius-lg`. Contains:
- **Cover thumb** (64×56, rounded, `object-fit: cover`).
- **Name** (Playfair 600, 20px, ellipsis) + **location** (mono 12px with a gold map-pin
  icon).
- **Discipline chips** (mono uppercase pills: Boulder / Lead / Top-rope).
- **Stats** — two right-aligned mono figures: **Routes** count and **Admins** count
  (admins derived from the assignments table).
- **Status control** (`.a-status`) — a colored pill that is **also a dropdown trigger**:
  click to open a menu (Live / Draft / Archived) and change status inline. Live = green,
  Draft = yellow, Archived = grey. The current status shows a ✓.
- **Row actions** — three 36×36 icon buttons: **Manage admins** (users icon → jumps to
  the Admins view focused on this gym), **Edit** (pencil → opens the gym modal), **Delete**
  (trash, danger hover → confirm dialog).

**Responsive (≤760px):** the row reflows to `56px thumb · name · status`, with chips,
stats, and the status/actions cluster wrapping onto their own full-width lines (the
status+actions line gets a hairline top border).

### Add / Edit gym modal (`#a-gym-overlay`)
Centered modal (`max-width: 540px`), scrim + blur, pop-in animation. Fields:
- **Gym name** (text, required).
- **City / location** (text, required) + **URL slug** (mono input with a fixed
  `betabase.app/gyms/` prefix). Slug **auto-derives** from the name until the operator
  edits it manually; on edit it's seeded from the existing id.
- **Disciplines** — a multi-toggle (Boulder / Lead / Top-rope); ≥1 required. Selected =
  gold fill.
- **Cover image** — a dashed drop slot ("Drop a photo or click to upload"). *(Prototype is
  visual only; wire to your real upload/storage.)*
- **Status** select — **shown only when editing** (new gyms always start as Draft).
- Inline **error** banner (red) above the fields on validation failure (missing name/city/
  slug, no discipline, or a **duplicate slug**).
- Footer: Cancel (ghost) + submit ("Add gym" / "Save changes").

> On **edit**, if the slug changes, the prototype migrates that gym's adminship and message
> references to the new id — replicate that as a real foreign-key update (or, better, key
> on an immutable gym `id` and treat the slug as a mutable field so no migration is needed).

### Confirm dialogs
Smaller modal (`max-width: 430px`): title + message + Cancel (ghost) / action button.
Used for:
- **Delete gym** (danger red) — warns it removes all walls, routes, and beta videos, and
  that its N admins lose access. "This can't be undone."
- **Archive gym** (ghost, used when archiving a gym that still has admins) — explains it's
  hidden from the public directory but data + admin access are kept.

---

## View 2 — Admins

**Purpose:** the operator assigns and removes gym admins.

**Layout:**
1. **Header** — eyebrow "Console", title "Admins", mono sub
   (`{n} admins across {n} of {n} gyms`).
2. **Hairline rule.**
3. **Search** — by gym, name, username, or email. Matching either a gym name (shows all
   its admins) or specific admins within a gym filters the list accordingly.
4. **Gym groups** (`.a-grouplist`) — one **collapsible card per gym** (Manage-Gym pattern).
5. **Empty state** when nothing matches the search.

### Gym group (`.a-group`)
- **Header row** (clickable, toggles collapse): a **chevron** (rotates −90° when
  collapsed), a 38px gym thumb, the gym **name** (Playfair) + **admin count** (mono), and a
  right-aligned **status tag** (Live / Draft / Archived).
- **Body** (hidden when collapsed): a list of **admin rows**, then an **"Add admin"** ghost
  button. If the gym has no admins, an italic hint ("No admins yet — assign someone to
  manage this gym's walls and routes.") replaces the list.

### Admin row (`.a-admin`)
Grid `40px avatar · name + meta · remove`. Background slate-800, hairline, `--radius-md`.
- **Avatar** — colored disc (hold-palette), uppercase initials, dark ink.
- **Name** (UI 600, 15px) + **meta** (mono: `@username · email`).
- **Remove** — danger icon button (user-x) → confirm dialog ("Remove {name} as an admin?"
  — they lose access to manage that gym; re-addable anytime).

### Add-admin modal (`#a-aa-overlay`)
Title "Add admin" + the gym name as sub. A **user search** (by name, username, or email)
over the Betabase user directory; results list each user (avatar + name + `@username ·
email`) with an **"Add"** primary button. Users who are already admins of this gym show a
green "✓ Admin" tag instead and are dimmed. Adding is **immediate** (no separate save) and
updates the Admins + Gyms views. Footer: "Done".

> **Cross-view link:** the Gyms view's "Manage admins" icon calls into this view, collapses
> all other groups, expands the target gym, and scrolls it into view — preserve that
> deep-link behavior (e.g. `/admin/admins?gym={id}`).

---

## View 3 — Messages

**Purpose:** the operator triages messages from the public contact form.

**Layout:** a header (eyebrow "Console", title "Messages", mono sub
`{n} unread · {n} in inbox`), a hairline rule, then a **two-pane inbox** (`.a-inbox`,
`380px 1fr`, bordered + rounded, `min-height: 560px`):

### Left — message list
- **Tools row:** a **segmented filter** (All / Unread / Archived, with counts) + a
  **search** (by sender name, email, or body).
- **Message items** (`.a-msg`): an **unread dot** (gold; hidden once read), the sender
  **name** (bold when unread, muted when read), a **timestamp** (today → time, else
  `Mon D`), a 2-line **snippet**, and a **tag row**: a colored **topic tag** (General /
  Add my gym / Bug report / Partnership / Other) and, when the message references a gym, a
  **gym tag** (mountain icon + gym name). Selected item gets a slate-700 fill + a gold left
  bar.

### Right — reading pane
- **Empty state** (inbox icon + "No message selected") until one is picked.
- When a message is open: a **"← Back to inbox"** link (mobile only), a serif **subject**
  (`{Topic} enquiry`), the topic + gym tags, a **from row** (avatar + name + mailto email +
  full timestamp), the **body** (`white-space: pre-wrap`, `max-width: 64ch`), and a
  **footer toolbar**: **Reply** (primary, opens `mailto:` with a prefilled subject),
  **Mark read/unread** toggle, a spacer, **Archive/Unarchive** toggle, and **Delete**
  (danger icon → confirm dialog).
- Opening an unread message **marks it read** (updates the sub + the sidebar/tab unread
  badge).

**Responsive (≤640px):** the two panes collapse to **one** — the list shows until you pick
a message, then the reading pane takes over (with the Back link); archiving from the
reading pane in a non-archived filter returns you to the list.

---

## Shared interactions & behavior
- **Navigation:** sidebar / bottom-tab items swap the active `.a-view`; the page scrolls to
  top on change. The unread badge stays in sync across the sidebar and tab bar.
- **Status dropdown / menus:** clicking outside closes any open status menu; menu item
  clicks `stopPropagation()` so they don't bubble.
- **Toast:** a small mono pill (bottom-center) confirms each successful mutation ("…added
  as a draft", "Gym updated", "Gym deleted", "{name} added as admin", "Message archived",
  etc.), auto-dismiss ~2.4s. Match your app's existing toast if it has one.
- **Esc** closes whichever overlay is open (confirm → add-admin → gym modal, in that
  priority). **Click outside** the modal closes it.
- **Empty states** everywhere (gym list, admin search, inbox) with tailored copy.
- Respects `prefers-reduced-motion` (disables transitions/animations).

## Suggested data model (map the prototype's `admin-data.js` to real tables)
The prototype keeps everything in memory; here's the shape it assumes:

```ts
type Gym = {
  id: string            // slug, e.g. "summit"
  name: string
  city: string
  chips: string[]       // disciplines: 'Boulder' | 'Lead' | 'Top-rope'
  routes: number        // count (derived from routes table in prod)
  status: 'live' | 'draft' | 'archived'
  img: string           // cover image URL
}

type User = { id: string; name: string; username: string; email: string; av: string /* avatar color */ }

type Adminship = { gymId: string; userId: string }   // join row: who admins which gym

type Message = {
  id: string
  name: string; email: string
  topic: 'general' | 'add_gym' | 'bug' | 'partnership' | 'other'
  gymId: string | null        // optional gym this message is about
  ts: string                  // ISO datetime
  read: boolean
  archived: boolean
  body: string
}
```

**Server Actions to build** (mirror Manage-Gym's `actions.ts` style, all superuser-gated):
`createGymAction`, `updateGymAction`, `setGymStatusAction`, `deleteGymAction`,
`addAdminAction`, `removeAdminAction`, `markMessageReadAction`, `archiveMessageAction`,
`deleteMessageAction`. Reads (gyms list, user directory for the add-admin search, messages)
are Server Component / route-handler fetches; revalidate via `revalidatePath('/admin')`.

---

## Design Tokens
All defined in **`reference/colors_and_type.css`** (mirror of `app/globals.css`). Key
values used on this screen:

**Colors**
- Surfaces: `--slate-900 #0E1216` (sidebar / inputs / inbox list), `--slate-800 #151A20`
  (content), `--slate-700 #1D242C` (cards / modals / reading pane), `--slate-600` (hover),
  `--slate-500` (`--hairline`), `--slate-400` (muted text / icons), `--slate-300`
  (secondary text).
- Text: `--chalk-50 #F6F9FB` (titles), `--chalk-100 #E7EDF2` (body / names).
- Accent: `--accent #C79F65` (plywood gold — primary buttons, active nav bar, unread
  badge, avatars), `--accent-hover #A47E48`, `--plywood-400 #D6B47F` (eyebrows / links /
  gold icons), `--plywood-700` (tag borders). Ink on gold: `--on-accent #1A1206`.
- Hairlines: `--hairline`, `--hairline-soft`.
- **Status / hold colors:** Live `--hold-green #4E9D5B`, Draft `--hold-yellow #EDB23A`,
  Archived `--slate-400`. Danger `--hold-red #D6453B`. Topic tags: General `#2E93AE`,
  Add-my-gym `#4E9D5B`, Bug `#D6453B`, Partnership `#7E5CA8`, Other `#8593A2` (rendered at
  ~14% alpha bg). Avatar palette = the hold colors.

**Typography**
- `--font-display` (Playfair Display) — view titles, gym names, modal titles, subjects.
- `--font-ui` (Hanken Grotesk) — body, nav labels, buttons, inputs, names.
- `--font-mono` (IBM Plex Mono) — eyebrows, subs, metadata, counts, chips, tags, status
  pills, timestamps, toast.
- Scale: view title `clamp(34–50px)`, gym/group name 20px, subject 26px, modal title 25px,
  body/input 14–15.5px, meta/mono 10–13px.

**Spacing / radius / shadow / motion**
- Radii: `--radius-sm 8`, `--radius-md 12`, `--radius-lg 18`, `--radius-pill 999`.
- Shadows: `--shadow-lg` (modals, menus, toast).
- Motion: `--dur 240ms` / `--dur-fast 140ms`, `--ease-out cubic-bezier(.22,1,.36,1)`.

## Assets
- `reference/logo-mark.png` — Betabase logo mark (use the app's canonical asset if it has
  one — same mark as the other handoffs).
- `reference/assets/*.png` — four gym cover photos used as row/group thumbnails
  (`gym-exterior`, `climbing-wall-hero`, `sending-climb`, `filming-climb`).
  > ⚠️ These are AI-generated stand-ins from the design system. **Swap for real, licensed
  > gym photography before production** (and use each gym's real uploaded cover).
- Icons are inline SVG (lucide-style strokes: mountain, users, mail, shield, search,
  map-pin, plus, pencil, trash, chevron, x, check, arrow-left, reply, archive, unarchive,
  inbox, user-plus, user-x, image, eye). Use the app's icon library (e.g. `lucide-react`)
  — the shapes are 1:1.

## Files
```
design_handoff_admin/
  README.md                     ← this file
  reference/                    ← the approved HTML prototype + its assets
    Admin.html                  ← full hifi prototype (open in a browser to see every
                                  view, modal, and state)
    admin.css                   ← all component styles (prefix .a-)
    admin.js                    ← prototype logic (vanilla JS, in-memory state)
    admin-data.js               ← seed data (gyms, users, adminships, topics, messages)
    colors_and_type.css         ← Betabase color & type tokens (mirrors app/globals.css)
    logo-mark.png               ← brand mark
    assets/                     ← gym cover photos (stand-ins)
```

## Reference
Open `reference/Admin.html` in a browser to explore everything: switch views from the
sidebar/tabs; in **Gyms** try the status dropdown, the search + filter, and Add/Edit/Delete;
in **Admins** expand a gym and use "Add admin"; in **Messages** open a message and try
reply / mark-read / archive / delete. Resize the window to see the sidebar → icon-rail →
bottom-tab-bar progression and the inbox collapsing to a single pane.
