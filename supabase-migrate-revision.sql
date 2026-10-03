-- Upgrade the existing three-column user_sessions table without replacing data.
-- RLS policies, grants, payloads and the existing revision trigger stay intact.
begin;
alter table public.user_sessions
  add column if not exists revision bigint not null default 0
  check (revision >= 0);
notify pgrst, 'reload schema';
commit;
