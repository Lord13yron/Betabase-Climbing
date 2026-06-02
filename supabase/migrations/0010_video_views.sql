-- Step 12 — beta video view counts.
-- Apply by pasting into the Supabase dashboard SQL editor.

-- Running tally of how many times a clip has been played. Bumped client-side
-- on first play per session (see incrementVideoViewAction).
alter table public.videos
  add column view_count integer not null default 0;

-- Viewers (incl. anonymous) have no UPDATE rights on videos, so expose a narrow
-- security-definer function that can only bump this one counter. This keeps the
-- table's RLS intact while letting any visitor record a view.
create or replace function public.increment_video_view(vid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.videos set view_count = view_count + 1 where id = vid;
$$;

grant execute on function public.increment_video_view(uuid) to anon, authenticated;
