# Мама и малыш — unblock/readiness record (2026-10-11)

**Status:** PROPOSAL ONLY. No production operations authorised.  
**Source branch baseline:** `feature/mama-i-malish-redesign`, `3c162f6bc3ddfdc999d7bd21f7c0757e2b466ff2`.  
**Protected main/production SHA:** `d9784b7662dc12ceb429a8b6dfba58c9a9e62e0c`.  
**Draft PR:** https://github.com/safarovmurod/cupping-massage/pull/2  
**Prior passing technical/browser workflows:** 38123906612 (lint/typecheck/test/build/audit), 38123906545 (52 browser smoke, 35 axe WCAG-tagged scans, six other synthetic UI checks). Existing tests are NOT a live Auth/RLS test.

## 1. Live PostgreSQL read-only ACL and RPC findings

Verified using `pg_class.relacl`, `aclexplode`, `has_table_privilege`, `pg_proc.proacl`, `has_function_privilege`, `pg_policies` and `pg_get_functiondef`. **No production writes or data reads beyond metadata/function definitions.**

- Each of these **nine** public tables has RLS enabled and an **explicit** `TRUNCATE` grant from `postgres` to **both** `anon` and `authenticated`: `admin_activity`, `analytics_events`, `leads`, `password_reset_requests`, `profiles`, `services`, `site_content`, `site_settings`, `user_activity`.
- `analytics_excluded_visitors` does **not** grant either role `TRUNCATE`. All nine targeted tables also grant it to `postgres` and `service_role`; retain those grants.
- `TRUNCATE` bypasses row-level security; if an adversary ever obtains SQL execution *as the app roles* or an unsafe SECURITY DEFINER wrapper, they can erase table contents and potentially cascade. The standard PostgREST Data API does **not** expose raw `TRUNCATE`. Therefore this is confirmed excess privilege with material blast radius, **not proof of an unauthenticated HTTP data-deletion vulnerability**.
- `anon` and `authenticated` lack `CREATE` on `public` or `private`. `private` has no schema `USAGE` for either, reducing function-name shadowing and direct private-RPC access.
- Nine relevant `public` SECURITY DEFINER RPC functions:
  - `is_admin()`: `EXECUTE` held by **PUBLIC**, `anon`, `authenticated`; returns caller-specific role status. **Do not revoke now**: `services_select` and `password_reset_requests` policies have an anonymous/PUBLIC path that invokes `is_admin()`; the prior `supabase/migration_06_function_grants.sql` explicitly documents this dependency. Rework policies and test anonymous service reads before hardening it.
  - `request_password_reset(text,text)` and `reset_password_with_code(text,text,text)`: callable by `anon` and `authenticated` **by design** so that signed-out users can recover accounts. Reset flow checks password strength, one-time six-digit code, code age/attempts, and private rate limits; request flow caps requests per email. Still investigate credential recovery abuse, global request volumes, forwarded-header trust, email enumeration through timing, random-number quality and code expiry in staging. **Do not blanket revoke or change these in production**.
  - `admin_create_reset_code_for_email(text)`, `admin_delete_test_users()`, `admin_delete_user(uuid)`, `admin_get_user_details(uuid)`, `admin_issue_reset_code(uuid)`, `admin_set_user_password(uuid,text)`: `authenticated` can **invoke** the RPC but each definition explicitly checks `public.is_admin()` before privileged work. Their actual authorization and no-side-effect behavior must be tested with a signed-in non-admin in isolated staging. `anon` has no EXECUTE for these six.
- Operational risk: `admin_delete_test_users()` matches non-admin addresses starting with `test`, **not a controlled per-ID test list**. Do not use it in any production review or test; a legitimate client address might match. Prefer per-ID disposable test data only in staging.
- Supabase Security Advisor currently reports public/authenticated SECURITY DEFINER findings and disabled leaked-password protection; `private.request_limits` has RLS but intentionally no public policy. Treat exposed recovery flows and password checks as separate owner-reviewed work, not part of the narrow TRUNCATE change.

Official guidance: https://supabase.com/docs/guides/database/functions and https://supabase.com/docs/guides/api/securing-your-api .

## 2. Prepared minimal privilege migration — NOT APPLIED

**UP:** [security/proposals/20261011_truncate_grants_up.sql](../../security/proposals/20261011_truncate_grants_up.sql)  
**Emergency rollback:** [security/proposals/20261011_truncate_grants_rollback.sql](../../security/proposals/20261011_truncate_grants_rollback.sql)

These proposals are **deliberately outside `supabase/migrations/`** to avoid auto-application. Only the nine explicit TRUNCATE grants on two low-trust roles would change. No table rows, policies, RPC functions, role memberships, default grants, secrets, trigger definitions or existing functionality should be changed. The UP file has a transactional fail-closed preflight and postcheck.

**Approval/testing gate, in order:**
1. Owner authorises an isolated disposable stage and confirms a recoverable backup/snapshot **for any database that would later be changed**. Record current ACL/RLS/policies/grants and exact SQL SHA. No production SQL writes at this phase.
2. Recreate **schema only** in an isolated database; insert **synthetic** leads, profile data and settings. Test current guest, user, admin and RPC flows **before** the proposed change.
3. Apply UP only to the disposable database using its owner account. Postcheck all nine: `anon=false`, `authenticated=false`, `service_role=true` for effective TRUNCATE; RLS still enabled. The function signatures and RLS must be identical.
4. Re-run all public reads, contact form, password recovery, admin CRUD on synthetic objects, and permission-denied tests. No failed normal workflow is acceptable.
5. If the same transaction fails before COMMIT, execute `ROLLBACK`; no grants change. After COMMIT, the rollback proposal re-grants unsafe privileges and must only be used after explicit approval and with evidence. Prefer fixing any application reliance on TRUNCATE instead.
6. A **second, separate authorisation** is required before any later production application. Never silently promote a staged migration to live.

## 3. Disposable Supabase integration environment (none created)

**Recommended zero-paid starting point: local Supabase CLI + Docker/compatible container runtime.** A separate hosted Supabase staging project is an alternative only if the owner expressly approves and it fits the available free slots. The currently connected project reports **no database branches**.

- Use a separate throwaway folder or clone and `supabase init` / `supabase start` locally. **Never `supabase link` to production** while preparing tests; `supabase db reset --local` must be used **only against the disposable local instance**.
- Recreate **schema only** from reviewed repository SQL and migrations. The repository contains `supabase/schema.sql`, legacy `supabase/migration_02_...08_...` scripts and only two newer files in `supabase/migrations/`; remote migration version history differs. **Important verified hazard:** `supabase/schema.sql` and legacy migration 02 contain `INSERT INTO profiles/site_settings/site_content` and other data/metadata statements. **Do not replay these files as-is**: extract and review DDL-only baseline, remove account seeding, real contact values and data-changing statements, then add wholly fictional seed files. **BLOCKED:** first reconcile a complete reproducible schema order on the isolated instance. Do not run the existing migration folder blindly or replay legacy SQL against production.
- Seed entirely fictional test users/accounts, e.g. `guest` (no account), `sandbox-user@example.invalid` (regular), `sandbox-admin@example.invalid` (admin provisioned by an authorised staging-only administrator); leads, contact settings, language data and event rows must be synthetic. Do not dump `auth.users`, phone numbers, leads, access tokens or customer records from production.
- **CRITICAL PREVIEW GATE:** `src/lib/supabase.ts` has a production-project fallback when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing. Before **any** Preview, explicitly provide the **disposable** Supabase URL and its **publishable/anon** key as Preview-only env vars. Fail the deployment if either missing or if configured URL equals live production. Never place a `service_role` key in `VITE_*`, source code or Git; don't share keys in reports. Currently there is no build-time fail-closed check, so this remains a critical release gate.
- Stage Google OAuth must use **separate staging-only** Google OAuth credentials and Supabase Auth configuration, including correct callback URL `https://<staging-ref>.supabase.co/auth/v1/callback`. Add only exact staging/local allowed redirect URLs; preserve production Site URL and provider settings. Owner must approve enabling Google Auth on disposable staging. Local Google login cannot be verified merely with mocked API responses.

**Acceptance matrix — all on isolated test data only:**

| Scenario | Expected result |
| --- | --- |
| Anonymous public site | Read public services/content/settings, contact form creates only a synthetic lead. SELECT/UPDATE/DELETE of leads/profiles denied. No privileged RPC access. |
| Ordinary user | Email/password login, own profile visible, own nonprivileged updates allowed; cannot change role/is_active, inspect other profiles, use admin UI/API or admin RPC. Logout and expired session safe. |
| Administrator | Separately provisioned staging admin can open all admin routes, read/update/create/delete disposable lead/content/settings entries and read audit records; no real client touched. |
| Negative RPC | Non-admin may be allowed to invoke admin-definer RPCs but must receive denied response and **zero mutation**. Never use bulk `admin_delete_test_users()` on real customers; exercise only deliberate synthetic targets. |
| Recovery | No-account response does not reveal registration; per-email and global rate limits, invalid/expired/reused code, 5 bad attempts, strong password and session invalidation behave safely. No real password changes. |
| Google OAuth | Staging-only test Google user, correct Supabase callback and exact allowlisted preview origin, successful return/session, cancelled login, wrong redirect rejected; no production client secret. |
| Privileges | The UP migration removes effective TRUNCATE for anon/authenticated on nine tables while retaining service_role; standard public/admin workflows remain operational. |

Source documentation: https://supabase.com/docs/guides/local-development/cli/getting-started , https://supabase.com/docs/guides/local-development/cli-workflows , https://supabase.com/docs/guides/auth/redirect-urls , https://supabase.com/docs/guides/auth/social-login/auth-google .

## 4. Vercel 403 — exact owner steps (no deployment or new project)

**Observed:** `GET /v9/projects/mama_i_malish` scoped to `safarovmurods-projects`, team `team_V9t1TW4aoJNs6cD5InHO2RxC` returns **403 forbidden / not authorized for scope**; connector team enumeration is empty. Unscoped 404 is inconclusive. Existing `massage_v1` remains untouched at known production SHA.

1. Log in to https://vercel.com/dashboard with the **account that owns the original team**, open team switcher and choose `safarovmurods-projects`. Confirm whether the team and `mama_i_malish` actually exist. Record **project ID** and plan *privately*; do not guess IDs or create a replacement.
2. Under team **Settings → Members** verify the active login's membership and permissions. If the owner has lost access, restore it through the current team owner/support. **Hobby membership invitations are not the free fix**: Vercel documentation makes invitations a Pro/Enterprise feature.
3. Under target project **Settings → Git**, confirm the connected repository is `safarovmurod/cupping-massage`, the production branch is `main`, and the working branch is eligible for Preview. Do **not** reconnect/disconnect Git, reassign domains, or modify production settings during inspection.
4. Re-authorize the existing Vercel connection for the **correct team scope** (e.g. under ChatGPT Settings → Plugins or by reconnecting with the original owner's account). Never paste a token into chat or commit one. Repeat read-only project lookup; stop until it returns the expected project ID.
5. Only when access, **commercially eligible plan**, project Git link and isolated Preview Supabase env are confirmed may the owner separately authorise a Preview build from `feature/mama-i-malish-redesign`. It must not merge `main` or target production. Verify deploy SHA, route health, HTTPS and no production Supabase network traffic.

Official references: https://vercel.com/docs/rbac/managing-team-members and https://vercel.com/docs/project-configuration/project-settings .

## 5. Commercial hosting plan: no migration authorised

- **Vercel Hobby:** personal/noncommercial only, so this massage business website must not be deployed commercially under Hobby. An eligible Vercel Pro/Enterprise account would be paid and needs separate owner approval. https://vercel.com/legal/terms .
- **Recommended free commercial alternative: Netlify Free.** Netlify staff explicitly confirmed ordinary Free tier commercial use (not the separate non-commercial-only Open Source plan). Current Free advertises Git deploys, unlimited deploy previews, custom domains/SSL and **300 monthly credits**; if the allowance is exhausted sites can be paused. Confirm owner-specific terms and traffic expectation before acceptance: https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545/6 and https://www.netlify.com/pricing/ .
- **Alternative to evaluate:** Cloudflare Pages Free, with 500 builds/month and static hosting; verify contract/acceptable-use fit for this business with the owner before any move: https://developers.cloudflare.com/pages/platform/limits/ .
- Existing React/Vite build: `npm run build` → `dist/`. On another host, port Vercel's route rewrites / SPA fallback and security/noindex headers; do **not** assume `vercel.json` is honoured. Require separate disposable Supabase Preview env, check Google OAuth redirects and origin/CSP before DNS cut-over.
- **No Netlify/Cloudflare project, deployment, domain migration or paid plan has been created/used.** Retain existing working Vercel production until the owner selects and verifies a compliant replacement.

## Owner-only action checklist

1. Approve or reject **disposable Supabase staging**; no real-client data transfer, provide test account provisioning **through safe secrets channels**.
2. Approve or reject rehearsal of the **prepared TRUNCATE-only SQL on staging**; any later live execution is a **separate request**.
3. Resolve Vercel team/project 403 with the existing team owner and confirm **Hobby vs eligible plan**; share project *ID/status*, not keys.
4. Choose **Netlify Free (commercial-allowed but credit-limited)** or another legally suitable host *if* Vercel plan is Hobby; explicitly authorise migration separately.
5. Provision staging-only Google OAuth client/callback/redirects; run genuine user/admin/CRUD tests and validate no production endpoints.

**Remaining BLOCKED:** real signed-in/RLS/CRUD permission checks, real Google OAuth and redirect config, reconciled staging schema, confirmed Vercel target project/plan/Preview URL, owner approval of SQL hardening, manual accessibility/device and live integration release gates.

**Release decision: NO-GO for production.** `main`, current production deployment, real Supabase records, RLS, RPC definitions, OAuth settings, existing secrets and all paid services remain unchanged.
