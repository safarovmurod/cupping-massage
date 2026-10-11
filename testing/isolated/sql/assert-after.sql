-- After the proposed staged REVOKE: test effective PostgreSQL privileges.
-- Must never run directly on a production database.
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
       OR has_table_privilege('anon',rel_id,'TRUNCATE')
       OR has_table_privilege('authenticated',rel_id,'TRUNCATE')
       OR NOT has_table_privilege('service_role',rel_id,'TRUNCATE') THEN
       RAISE EXCEPTION 'After UP ACL or RLS did not match on %',table_name;
    END IF;
  END LOOP;
END $check$;
DO $exercise$
DECLARE caller text; table_name text;
BEGIN
  FOREACH caller IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH table_name IN ARRAY ARRAY[
      'admin_activity', 'analytics_events', 'leads', 'password_reset_requests',
      'profiles', 'services', 'site_content', 'site_settings', 'user_activity'
    ] LOOP
      BEGIN
        EXECUTE format('SET LOCAL ROLE %I', caller);
        EXECUTE format('TRUNCATE TABLE public.%I', table_name);
        -- Fail and roll back if a role unexpectedly manages to truncate a table.
        RAISE EXCEPTION 'FAIL: % can TRUNCATE % after REVOKE', caller, table_name;
      EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS: actual TRUNCATE denied with 42501 for % on %', caller, table_name;
      END;
    END LOOP;
  END LOOP;
  BEGIN
    SET LOCAL ROLE service_role;
    TRUNCATE TABLE public.admin_activity, public.analytics_events, public.leads,
      public.password_reset_requests, public.profiles, public.services,
      public.site_content, public.site_settings, public.user_activity;
    RAISE EXCEPTION USING ERRCODE = 'ZX001', MESSAGE = 'rollback service TRUNCATE exercise';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN
    RAISE NOTICE 'PASS: service_role real TRUNCATE still allowed, changes rolled back';
  END;
END $exercise$;
SELECT 'PASS: nine table grants revoked, RLS and service_role preserved' AS message;
