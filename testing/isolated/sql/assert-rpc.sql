-- Catalog verification ONLY in the exact isolated Docker DB. Missing functions
-- are failures, never mistaken for an authorization denial by HTTP tests.
DO $check$
DECLARE signature text; function_id oid;
BEGIN
  IF current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'Isolated PostgreSQL major must be 17';
  END IF;
  FOREACH signature IN ARRAY ARRAY[
    'public.admin_create_reset_code_for_email(text)', 'public.admin_delete_test_users()',
    'public.admin_delete_user(uuid)', 'public.admin_get_user_details(uuid)',
    'public.admin_issue_reset_code(uuid)', 'public.admin_set_user_password(uuid,text)'
  ] LOOP
    function_id := to_regprocedure(signature);
    IF function_id IS NULL OR NOT (SELECT prosecdef FROM pg_proc WHERE oid=function_id)
       OR has_function_privilege('anon', function_id, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', function_id, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected admin SECURITY DEFINER privilege/signature: %', signature;
    END IF;
    RAISE NOTICE 'PASS: admin definer exists, anon EXECUTE denied, authenticated EXECUTE allowed: %', signature;
  END LOOP;
  FOREACH signature IN ARRAY ARRAY[
    'public.is_admin()', 'public.request_password_reset(text,text)',
    'public.reset_password_with_code(text,text,text)'
  ] LOOP
    function_id := to_regprocedure(signature);
    IF function_id IS NULL OR NOT (SELECT prosecdef FROM pg_proc WHERE oid=function_id)
       OR NOT has_function_privilege('anon', function_id, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', function_id, 'EXECUTE') THEN
      RAISE EXCEPTION 'Public helper/reset privilege/signature differs: %', signature;
    END IF;
  END LOOP;
  FOREACH signature IN ARRAY ARRAY[
    'public.handle_new_user()', 'public.protect_profile_privileged_fields()',
    'private.guard_public_insert()', 'private.allow_request(text,integer,integer)'
  ] LOOP
    function_id := to_regprocedure(signature);
    IF function_id IS NULL OR has_function_privilege('anon', function_id, 'EXECUTE')
       OR has_function_privilege('authenticated', function_id, 'EXECUTE') THEN
      RAISE EXCEPTION 'Internal function incorrectly executable: %', signature;
    END IF;
  END LOOP;
  function_id := to_regprocedure('public.admin_analytics_summary()');
  IF function_id IS NULL OR (SELECT prosecdef FROM pg_proc WHERE oid=function_id)
     OR has_function_privilege('anon', function_id, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', function_id, 'EXECUTE') THEN
    RAISE EXCEPTION 'Analytics invoker RPC privilege/signature differs';
  END IF;
  IF has_schema_privilege('anon', 'private', 'USAGE')
     OR has_schema_privilege('authenticated', 'private', 'USAGE')
     OR has_schema_privilege('anon', 'public', 'CREATE')
     OR has_schema_privilege('authenticated', 'public', 'CREATE') THEN
    RAISE EXCEPTION 'Private schema or public CREATE privilege differs';
  END IF;
END $check$;
SELECT 'PASS: PostgreSQL 17 / public RPC / trigger functions / private schema ACL' AS message;
