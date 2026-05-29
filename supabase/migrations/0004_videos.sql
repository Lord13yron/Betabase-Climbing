-- Step 9 — videos table (Mux beta clips), RLS.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes (id) on delete cascade,
  uploader_id uuid not null references public.profiles (id) on delete cascade,
  -- Mux direct-upload id; the webhook keys the row off this to fill in the
  -- asset/playback ids once transcoding finishes. Unique so that lookup is 1:1.
  mux_upload_id text not null unique,
  mux_asset_id text,
  mux_playback_id text,
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'errored')),
  caption text,
  created_at timestamptz not null default now()
);

create index videos_route_id_idx on public.videos (route_id);

alter table public.videos enable row level security;

-- Public read: anyone can watch beta on a route.
create policy "Videos are viewable by everyone"
  on public.videos
  for select
  using (true);

-- Any authenticated user may add beta, but only as themselves.
create policy "Authenticated users can insert own videos"
  on public.videos
  for insert
  to authenticated
  with check (uploader_id = auth.uid());

-- Delete by the uploader, the managing gym's manager, or an admin. The gym is
-- resolved from the video's route. Reuses the is_admin()/is_gym_manager()
-- SECURITY DEFINER helpers from earlier migrations.
create policy "Uploader, managers, and admins can delete videos"
  on public.videos
  for delete
  using (
    uploader_id = auth.uid()
    or public.is_admin()
    or public.is_gym_manager(
      (select gym_id from public.routes where id = videos.route_id)
    )
  );
