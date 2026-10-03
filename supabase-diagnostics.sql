-- READ ONLY. Run in the existing project's SQL editor. No account or data changes.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'user_sessions'
order by ordinal_position;

select relrowsecurity from pg_class
where oid = to_regclass('public.user_sessions');

select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'user_sessions';

select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'user_sessions'
and grantee in ('anon','authenticated');

-- Do not drop/recreate the table or an auth user to fix a login problem.
-- Do not publish query results containing personal data.
