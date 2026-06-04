-- Step — contact_messages table (public contact form submissions), RLS.
-- Apply by pasting into the Supabase dashboard SQL editor.

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  -- Null for anonymous (logged-out) submissions; set if the sender was signed in.
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null,
  topic text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Anyone (anon or authenticated) may submit a message via the contact form.
create policy "Anyone can submit a contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies: submissions are only readable from the
-- Supabase dashboard / service role, never by clients.
