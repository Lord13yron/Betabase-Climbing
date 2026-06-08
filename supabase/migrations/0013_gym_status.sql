-- Step — gyms.status (live / draft / archived) for the admin console.
-- Apply by pasting into the Supabase dashboard SQL editor.

alter table public.gyms
  add column status text not null default 'draft'
  check (status in ('live', 'draft', 'archived'));

-- Existing gyms are already public, so mark them live. New gyms created from the
-- admin console default to 'draft' (the column default above).
update public.gyms set status = 'live';
