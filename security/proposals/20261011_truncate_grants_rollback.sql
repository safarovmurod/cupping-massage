-- EMERGENCY ROLLBACK PROPOSAL ONLY: NEVER APPLY AUTOMATICALLY.
-- Do not use merely to silence a test failure: this restores the original
-- excessive TRUNCATE permissions and lowers security. Requires explicit owner
-- authorization and proof that a required workflow actually depends on them.
-- A same-transaction issue should be handled with ROLLBACK before COMMIT.
-- No client data or migration history is restored by these grants.
BEGIN;
GRANT TRUNCATE ON TABLE
  public.admin_activity,
  public.analytics_events,
  public.leads,
  public.password_reset_requests,
  public.profiles,
  public.services,
  public.site_content,
  public.site_settings,
  public.user_activity
TO anon, authenticated;
COMMIT;
-- After an approved rollback, recheck ACL, RLS and security advisors and
-- immediately revisit the more precise application-level fix.
