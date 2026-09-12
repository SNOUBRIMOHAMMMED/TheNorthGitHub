begin;
-- Intentionally fails if an incompatible table already exists: inspect before migrating.
create table public.user_sessions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload) = 'object'),
A updated_at timestamptz not null default now()
);
alter table public.user_sessions enable row level security;
revoke all on public.user_sessions from anon, authenticated;
grant select, insert, update on public.user_sessions to authenticated;
create policy north_read_own on public.user_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy north_insert_own on public.user_sessions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy north_update_own on public.user_sessions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create function public.north_session_revision() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.user_id <> old.user_id or new.revision <> old.revision + 1 then
  raise exception 'Invalid revision';
 end if;
 new.updated_at = now();
 return new;
end;
$$;
create trigger north_session_revision before update on public.user_sessions for each row execute function public.north_session_revision();
commit;
