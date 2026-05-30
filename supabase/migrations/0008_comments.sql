-- Step 13 — comments table (flat, on routes or videos), RLS.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- A comment targets exactly one of a route or a video (CHECK below). Both
  -- cascade, so video comments die with the video and route comments with the
  -- route (and a video's comments die when its route is reset).
  route_id uuid references public.routes (id) on delete cascade,
  video_id uuid references public.videos (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comment_target_exactly_one check (
    (route_id is not null and video_id is null)
    or (route_id is null and video_id is not null)
  )
);

create index comments_route_id_idx on public.comments (route_id);
create index comments_video_id_idx on public.comments (video_id);

alter table public.comments enable row level security;

-- Public read: anyone can read the discussion on a route/video.
create policy "Comments are viewable by everyone"
  on public.comments
  for select
  using (true);

-- Any authenticated user may comment, but only as themselves.
create policy "Authenticated users can insert own comments"
  on public.comments
  for insert
  to authenticated
  with check (author_id = auth.uid());

-- Delete by the author, the managing gym's manager, or an admin. The gym is
-- resolved from the comment's route, or from its video's route. Reuses the
-- is_admin()/is_gym_manager() SECURITY DEFINER helpers from earlier migrations.
create policy "Author, managers, and admins can delete comments"
  on public.comments
  for delete
  using (
    author_id = auth.uid()
    or public.is_admin()
    or public.is_gym_manager(
      coalesce(
        (select gym_id from public.routes where id = comments.route_id),
        (select r.gym_id
           from public.videos v
           join public.routes r on r.id = v.route_id
          where v.id = comments.video_id)
      )
    )
  );
