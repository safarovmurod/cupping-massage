-- Run ONLY with the dedicated local Docker Postgres container and -v
-- ON_ERROR_STOP=1. Real TRUNCATE runs inside rolled-back subtransactions only.
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
DO $exercise$
DECLARE caller text;
BEGIN
  FOREACH caller IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    BEGIN
      EXECUTE format('SET LOCAL ROLE %I', caller);
      TRUNCATE TABLE public.admin_activity, public.analytics_events, public.leads,
        public.password_reset_requests, public.profiles, public.services,
        public.site_content, public.site_settings, public.user_activity;
      -- This exception rolls back TRUNCATE and SET ROLE; no synthetic row is lost.
      RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'rollback TRUNCATE exercise';
    EXCEPTION WHEN SQLSTATE 'ZX001' THEN
      RAISE NOTICE 'PASS: baseline/rollback real TRUNCATE by %, changes rolled back', caller;
    END;
  END LOOP;
END $exercise$;
SELECT 'PASS: nine staging ACLs and real rolled-back TRUNCATE before change' AS message;
