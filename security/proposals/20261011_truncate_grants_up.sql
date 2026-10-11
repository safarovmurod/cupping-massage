-- PROPOSAL ONLY - NOT APPLIED, NOT AUTO-DEPLOYABLE.
-- Keep outside supabase/migrations. Obtain owner approval; rehearse on a
-- disposable Supabase database containing synthetic records only.
-- Precondition checked read-only on 2026-10-11: all nine listed tables
-- have explicit TRUNCATE grants for anon and authenticated.
-- No user records, RLS policies, SECURITY DEFINER functions or secrets change.
--
-- Apply as ONE transaction using the database owner only after stage PASS.
BEGIN;

DO $preflight$
DECLARE
  table_name text;
  table_id oid;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.admin_activity',
    'public.analytics_events',
    'public.leads',
    'public.password_reset_requests',
    'public.profiles',
    'public.services',
    'public.site_content',
    'public.site_settings',
    'public.user_activity'
  ]
  LOOP
    table_id := to_regclass(table_name);
    IF table_id IS NULL THEN
      RAISE EXCEPTION 'Abort: table % does not exist', table_name;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      WHERE c.oid = table_id
        AND c.relkind IN ('r','p')
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'Abort: table % has unexpected kind or RLS state', table_name;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
      WHERE c.oid = table_id
        AND acl.grantee = 'anon'::regrole
        AND acl.privilege_type = 'TRUNCATE'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_class c
      CROSS JOIN LATERAL aclexplode(c.relacl) AS acl
      WHERE c.oid = table_id
        AND acl.grantee = 'authenticated'::regrole
        AND acl.privilege_type = 'TRUNCATE'
    ) THEN
      RAISE EXCEPTION 'Abort: direct TRUNCATE grant differs for %', table_name;
    END IF;
    IF NOT has_table_privilege('service_role', table_id, 'TRUNCATE') THEN
      RAISE EXCEPTION 'Abort: service_role TRUNCATE unexpectedly missing on %', table_name;
    END IF;
  END LOOP;
END
$preflight$;

REVOKE TRUNCATE ON TABLE
  public.admin_activity,
  public.analytics_events,
  public.leads,
  public.password_reset_requests,
  public.profiles,
  public.services,
  public.site_content,
  public.site_settings,
  public.user_activity
FROM anon, authenticated;

DO $postcheck$
DECLARE
  table_name text;
  table_id oid;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'public.admin_activity',
    'public.analytics_events',
    'public.leads',
    'public.password_reset_requests',
    'public.profiles',
    'public.services',
    'public.site_content',
    'public.site_settings',
    'public.user_activity'
  ]
  LOOP
    table_id := to_regclass(table_name);
    IF has_table_privilege('anon', table_id, 'TRUNCATE')
       OR has_table_privilege('authenticated', table_id, 'TRUNCATE') THEN
      RAISE EXCEPTION 'Abort: TRUNCATE is still effective on %', table_name;
    END IF;
    IF NOT has_table_privilege('service_role', table_id, 'TRUNCATE') THEN
      RAISE EXCEPTION 'Abort: service_role TRUNCATE unexpectedly changed on %', table_name;
    END IF;
  END LOOP;
END
$postcheck$;

COMMIT;

-- Post-commit read-only validation (separate query in approved staging):
-- SELECT c.relname, c.relrowsecurity,
--        has_table_privilege('anon',c.oid,'TRUNCATE') AS anon_truncate,
--        has_table_privilege('authenticated',c.oid,'TRUNCATE') AS auth_truncate,
--        has_table_privilege('service_role',c.oid,'TRUNCATE') AS service_truncate
-- FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
-- WHERE n.nspname='public' AND c.relname IN (
--   'admin_activity','analytics_events','leads','password_reset_requests',
--   'profiles','services','site_content','site_settings','user_activity'
-- ) ORDER BY c.relname;
--
-- Expected per row: relrowsecurity=true, anon_truncate=false,
-- auth_truncate=false, service_truncate=true.
--
-- IMPORTANT: Deliberately NO changes to is_admin(), RLS, or password-reset
-- functions. Public RLS policies on services and password_reset_requests use
-- is_admin(); revoking its anon EXECUTE without rewriting those policies can
-- break legitimate anonymous reads. Do not use blanket REVOKE on functions.
