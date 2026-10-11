# Isolated Supabase integration sandbox — NOT production

**Status: PREPARED, NOT EXECUTED in this environment.** Docker CLI, Supabase CLI
and `psql` are unavailable here. Do not mark Auth/RLS/CRUD/RPC/TRUNCATE as PASS
until the corresponding local commands actually succeed.

This sandbox is intentionally under `testing/isolated/`, not the repository's
production `supabase/` folder. The CLI runs against the **working directory**.
Never use `supabase link`, `db push`, `db pull`, `db dump --linked`,
`--linked`, production database passwords, or production Supabase API keys here.

## 0. Prerequisites and exact tooling

Install Docker Desktop / Docker Engine and official Supabase CLI on a **trusted
developer workstation**. Docs:
https://supabase.com/docs/guides/local-development/cli/getting-started
https://supabase.com/docs/reference/cli/supabase-start
https://supabase.com/docs/guides/local-development/cli/config

From the repository root, verify:

```sh
docker version
supabase --version
node --version
npm ci
```

The project is pinned to PostgreSQL major **17**, matching the previously
read-only verified live version `17.6`. Do not use the production DB for
bootstrap. Check that TCP ports **54321–54324** are not occupied by another
instance. The exact local Docker project ID is
`mama_i_malish_isolated_2026`. Local API and DB ports are 54321/54322.
The local Inbucket email catcher does not deliver email externally.

## 1. Start local stack, without linking any remote

```sh
cd testing/isolated
supabase start
supabase status
```

Starting from `testing/isolated` matters: this directory has its **own**
`supabase/config.toml`, migrations and seed. The root `supabase/` migrations
are **not** applied.

The three reviewed local migrations are created only from the **schema and
function definitions** of legacy scripts. The reviewed copy explicitly omits
the top-level `INSERT` statements from `schema.sql` and migration 02
(customer/profile backfills and legacy business contacts/content), and omits
the visitor backfill in the newer analytics migration. The only directly
executed INSERT seed is `seed.sql` containing **fictional content**, not
accounts or customers. SQL INSERTs *inside CREATE FUNCTION bodies* are
definitions, not imported rows.

**Schema reproduction status:** manually prepared, not proven by `supabase
start` here. Do not claim reproducibility PASS until the start/migration
step succeeds on a fresh Docker volume.

## 2. Configure React/Vite in this local sandbox

Copy the repository's `.env.example` to `.env.local` locally, leave it
untracked, and update the **local publishable/anon** key from `supabase status`
on the same machine:

```dotenv
VITE_DEPLOY_STAGE=local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<LOCAL_PUBLISHABLE_KEY_FROM_CLI>
```

Do not paste actual values into GitHub/ChatGPT logs. Run `npm run dev` from
the repository root on port 5173 (Vite default). Missing any required
environment setting makes the app **fail closed**, not use production.
The `ci-mock` stage is only allowed inside GitHub Actions and contains no
real Supabase access.

## 3. Nine-table TRUNCATE migration and rollback (ONLY local Docker)

After `supabase start`, run from the repository root:

```sh
bash testing/isolated/run-acl-local.sh
```

The script refuses to proceed unless an **exactly named** Docker container
`supabase_db_mama_i_malish_isolated_2026` is running. This exact check is
an important safety gate; if the CLI uses another name, stop and inspect it
locally rather than blindly changing the script.

The script validates **all nine** public tables: baseline grants and RLS,
applies the existing *proposal* `security/proposals/..._up.sql` **only to the
local database**, verifies anon/authenticated are denied TRUNCATE while
service_role remains allowed, tests the rollback **only locally**, and
finally re-applies the secure REVOKE and verifies the final state.

No actual `TRUNCATE` command is executed, so synthetic test rows remain.
Reverting the grant in production would be unsafe and needs explicit approval.
The local rollback rehearsal is not production approval.

## 4. Genuine synthetic integration tests (no API mocks)

Run **only after** step 3 completes:

```sh
node testing/isolated/test-auth-crud.mjs
```

This script executes `supabase status -o env` in the isolated workdir,
reads the **local-only** publishable and local service-role keys into
in-memory variables (never prints them), and terminates unless the returned
URL is exactly loopback:54321. It then uses the actual local Auth and Data
APIs and creates synthetic `example.invalid` accounts:

- Real sign-up, login, logout and re-login.
- Create isolated admin and verify active `role=admin`.
- RLS for own profile, denial of other profiles, attempted role escalation.
- Real guest lead INSERT, admin SELECT/UPDATE/DELETE only on that synthetic
  lead, and denial of ordinary user's lead access/mutation.
- Admin CRUD for synthetic `site_content` and `site_settings` keys.
- Public read of `services` to verify RLS's `is_admin()` dependency.
- Real anonymous `is_admin()` RPC, normal/admin `is_admin()`, and denial
  of six admin SECURITY DEFINER RPCs invoked with a normal user's JWT.
- Real isolated `request_password_reset`, admin test code issuance,
  bad-code rejection, single-use code and successful password replacement.

The script generates passwords in process memory, does not log them, and
deletes only its two newly created synthetic test identities afterward.
It must never run against production (fail-fast URL check).

**Do NOT use** bulk `admin_delete_test_users()` with administrator
credentials even during general project maintenance: it matches user email
prefixes and may remove legitimate accounts. The negative test invokes it
**as non-admin only**, with strict guard expectations.

If a test fails, mark its outcome FAIL; do not skip it or substitute
previous mocked Chromium coverage for real integration.

## 5. Safe test-only reset

**Destructive for the isolated local database; do not run in the repository
root or on a linked project.** After verifying `pwd` is
`testing/isolated` and the project ID in its config:

```sh
cd testing/isolated
supabase db reset --local
```

A reset wipes only the local synthetic instance and reapplies reviewed local
migrations and synthetic seed. It restores the baseline excessive TRUNCATE
grants intentionally; **re-run `run-acl-local.sh` before integration tests**.

## 6. Google OAuth — separate owner action

Local development defaults to **Google disabled**. For a real integration
test, the owner must create a **separate Google OAuth Web Application** in
Google Auth Platform/Cloud Console, not reuse/modify production settings.

Authorised JavaScript origin: `http://127.0.0.1:5173`.  
Authorised Google callback: `http://127.0.0.1:54321/auth/v1/callback`.

Only after the owner approves, set `[auth.external.google]` enabled in
`testing/isolated/supabase/config.toml` and populate `client_id` and
`secret = "env(SANDBOX_GOOGLE_CLIENT_SECRET)"` without committing values.
Restart the local Supabase stack. Test real Google sign-in, correct
origin/callback, denied unlisted redirects, cancel/retry and role `user`
on first OAuth registration. Check the project's `signInWithOAuth`
`redirectTo` points to `window.location.origin + '/'`.

For later **hosted staging**, use a completely separate Supabase project
(which the owner must authorise) and callback
`https://<STAGING_PROJECT_REF>.supabase.co/auth/v1/callback`.
Only add the **exact** staging Preview URLs to its Auth allowlist. Never edit
the production provider configuration.

Docs: https://supabase.com/docs/guides/auth/social-login/auth-google
https://supabase.com/docs/guides/auth/redirect-urls

## 7. Remote Preview is a DIFFERENT test tier

`localhost:54321` is **not reachable** from a cloud Vercel/Netlify Preview.
Cloud Preview requires a separately approved, Internet-reachable hosted
Supabase staging project with synthetic data only. Supply **Preview-scoped**
`VITE_DEPLOY_STAGE=preview`, `VITE_SUPABASE_URL` (staging HTTPS API),
and staging `VITE_SUPABASE_ANON_KEY`; do not use any production values.

Future production deployments must explicitly use
`VITE_DEPLOY_STAGE=production` and `VITE_PRODUCTION_ORIGIN` matching their
exact authorised public origin, and explicitly set the production Supabase
URL/key. This is stricter than the old fallback and will require setting
those variables **before an approved future release**. Current production
stays unchanged on its existing deployment.

Vercel team `safarovmurods-projects` / target project
`mama_i_malish` remains blocked by 403. Vercel Hobby prohibits commercial
use; do not create projects, deploy, merge `main`, change domain/DNS,
or buy a plan without owner permission.

## Acceptance / last-known evidence

| Check | Status now | Pass condition |
| --- | --- | --- |
| Production Supabase fallback | FIXED IN BRANCH, CI pending | Missing/mismatched environment rejected at build + runtime |
| Local CLI/Docker installation | BLOCKED | `docker version`, `supabase --version` |
| Three reviewed staging migration scripts | PREPARED, NOT TESTED | Fresh `supabase start` succeeds |
| Nine table TRUNCATE/revoke/rollback | NOT TESTED | Exact-container local SQL assertions all PASS |
| Real Auth/user/admin RLS, CRUD, RPC | NOT TESTED | Local integration script all PASS |
| Real Google OAuth | BLOCKED | Separate sandbox credentials + real redirect test |
| Hosted Preview | BLOCKED | Vercel 403 resolved, approved commercial plan, hosted staging backend |
