-- Step — gym_managers admin write policies. The /admin Admins view assigns and
-- removes gym admins; previously rows were dashboard/service-role only.
-- Apply by pasting into the Supabase dashboard SQL editor.

create policy "Admins can assign gym managers"
  on public.gym_managers
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can remove gym managers"
  on public.gym_managers
  for delete
  to authenticated
  using (public.is_admin());
