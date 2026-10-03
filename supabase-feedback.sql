-- Optional feedback inbox. Run once in Supabase SQL Editor.
-- Additive: does not change user_sessions or existing customer data.
create table if not exists public.north_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('feature','ux','bug')),
  message text not null check (char_length(message) between 1 and 5000),
  email text not null default '',
  created_at timestamptz not null default now()
);
alter table public.north_feedbacks enable row level security;
revoke all on public.north_feedbacks from anon, authenticated;
grant insert on public.north_feedbacks to authenticated;
drop policy if exists north_feedback_insert on public.north_feedbacks;
create policy north_feedback_insert on public.north_feedbacks
  for insert to authenticated with check ((select auth.uid()) = user_id);
-- Only administrators/service role can read the feedback inbox.
