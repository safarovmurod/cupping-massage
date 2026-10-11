-- Return one digest, not row data. The narrow REVOKE/rollback must preserve
-- all other public/private ACLs, RLS policies, function definitions and rows.
CREATE TEMP TABLE invariant_parts (value text);
INSERT INTO invariant_parts
SELECT concat_ws('|', 'table', n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity,
                 acl.grantor, acl.grantee, acl.privilege_type, acl.is_grantable)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN LATERAL aclexplode(c.relacl) acl ON acl.privilege_type <> 'TRUNCATE'
WHERE n.nspname IN ('public', 'private') AND c.relkind IN ('r', 'v', 'p');
INSERT INTO invariant_parts
SELECT concat_ws('|', 'policy', polrelid::regclass, polname, polcmd, polpermissive,
                 polroles::text, pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid))
FROM pg_policy;
INSERT INTO invariant_parts
SELECT concat_ws('|', 'function', p.oid::regprocedure, p.proacl::text, pg_get_functiondef(p.oid))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname IN ('public', 'private') AND p.prokind='f';
DO $rows$
DECLARE table_name text; digest text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'admin_activity', 'analytics_events', 'leads', 'password_reset_requests',
    'profiles', 'services', 'site_content', 'site_settings', 'user_activity'
  ] LOOP
    EXECUTE format('SELECT md5(coalesce(string_agg(row_to_json(t)::text, ''|'' ORDER BY row_to_json(t)::text), '''')) FROM public.%I t', table_name)
      INTO digest;
    INSERT INTO invariant_parts VALUES ('rows|' || table_name || '|' || digest);
  END LOOP;
END $rows$;
SELECT md5(string_agg(value, E'\n' ORDER BY value)) FROM invariant_parts;
