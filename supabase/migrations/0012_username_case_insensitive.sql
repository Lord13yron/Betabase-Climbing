-- Step 12 — case-insensitive uniqueness for profiles.username.
-- Apply by pasting into the Supabase dashboard SQL editor.
--
-- Backs the case-insensitive live check (.ilike) in app/onboarding/actions.ts so
-- 'Crux' and 'crux' collide at write time and the 23505 fallback in
-- claimUsernameAction is meaningful. NULL usernames (unclaimed stub profiles)
-- are allowed many times over by a unique index, so this is safe for the
-- handle_new_user() trigger that inserts rows with username = NULL.

create unique index profiles_username_lower_key
  on public.profiles (lower(username));
