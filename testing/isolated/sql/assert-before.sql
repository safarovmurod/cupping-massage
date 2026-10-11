-- Run ONLY with the dedicated local Docker Postgres container and -v
-- ON_ERROR_STOP=1. No TRUNCATE statement is ever executed by these assertions.
-- Before UP / after staging-only emergency rollback: all nine grants exist.
DO $check$
DECLARE table_name text; rel_id oid;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'admin_activity', 'analytics_events', 'leads',
    'password_reset_requests', 'profiles', 'services',
    'site_content', 'site_settings', 'user_activity'
  ] LOOP
    rel_id := to_regclass('public.' || table_name);
    IF rel_id IS NULL OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid=rel_id)
       OR NOT has_table_privilege('anon',rel_id,'TRUNCATE')
       OR NOT has_table_privilege('authenticated',rel_id,'TRUNCATE')
       OR NOT has_table_privilege('service_role',rel_id,'TRUNCATE') THEN
       RAISE EXCEPTION 'Before/rollback ACL or RLS did not match on %', table_name;
    END IF;
  END LOOP;
END $check$;
SELECT 'PASS: nine staging ACLs before change' AS message;
