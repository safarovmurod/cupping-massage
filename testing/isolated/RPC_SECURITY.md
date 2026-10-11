# Read-only RPC / SECURITY DEFINER security matrix

Baseline source: metadata and `pg_get_functiondef` from live PostgreSQL
`alafwzjqxwjanoqrirwi` (read-only, 2026-10-11) plus current branch code.
**No production RPC was invoked, and no live authentication was performed.**
The `testing/isolated/test-auth-crud.mjs` suite exercises API behavior against
**only** local loopback Supabase. [Run 38129662154](https://github.com/safarovmurod/cupping-massage/actions/runs/38129662154)
at `d8410947106a2053083ec3142fb16ef428977c17` passed 100 real API checks on
PostgreSQL 17.11, together with effective SQL EXECUTE/catalog checks.

The matrix's **live metadata is a dated read-only snapshot**, not a new
production verification. The isolated reviewed SQL already uses
`extensions.gen_random_bytes(4)` for reset-code generation, unlike the
snapshot's `random()` implementations. Local success validates the committed
test schema, not production parity or an applied production hardening.

PostgREST exposes `public` as an API schema. `EXECUTE` allows reaching a
public function's endpoint; it is **not** proof that a caller passes the
function's internal authorization guard. Calls to the private schema are not
externally exposed; `anon` and `authenticated` have no `USAGE` on `private`.

| Signature | Role EXECUTE / API | Purpose | RLS or security dependency | Principal residual risk | Isolated real test |
| --- | --- | --- | --- | --- | --- |
| `public.is_admin()` | PUBLIC, anon, authenticated | Returns whether current auth.uid() has active admin profile | Directly used in policies for services, profiles, password_reset_requests, leads, content, settings, analytics | Exposes a boolean, but no data by itself; **revoking anonymously can break public services** | Guest false; user false; admin true; RLS public service read |
| `public.request_password_reset(text,text)` | anon, authenticated | Creates an anonymous password reset request with per-email rate limit and generic response | Reads `auth.users` with definer privilege; uses reset_requests | Automated request flooding, timing/abuse; backend capacity and IP handling | Guest synthetic request, invalid input/rate limit cases |
| `public.reset_password_with_code(text,text,text)` | anon, authenticated | Checks six-digit code, expiry, attempts, strength; updates password and invalidates sessions | Security definer writes to auth.users/sessions; calls `private.allow_request()` | Credential takeover if recovery code guessed/leaked or throttling bypassed; never revoke blanketly or user recovery breaks | Bad, expired, reused code, good code/new login on synthetic user |
| `public.admin_create_reset_code_for_email(text)` | authenticated (anon denied) | Issues one-time recovery code by admin | Calls is_admin() before `auth.users`/request writes | Uses `random()` (not cryptographic CSPRNG) to generate six digits; administrator misuse | User denied; staging admin issues only synthetic code |
| `public.admin_issue_reset_code(uuid)` | authenticated (anon denied) | Issues code for a pending reset request | Calls is_admin() | Token disclosure on compromised admin, reset abuse; `random()` entropy | User denied; staging admin issues synthetic code |
| `public.admin_set_user_password(uuid,text)` | authenticated (anon denied) | Admin directly changes an account password | Calls is_admin() before updating `auth.users` | **6-character minimum** weaker than public password policy; compromised-admin/high-impact RPC | User denied; staging admin changes disposable user password only |
| `public.admin_delete_user(uuid)` | authenticated (anon denied) | Deletes one account and its related activity | Calls is_admin(); prohibits own and last-admin deletion | Permanent deletion of chosen user if admin compromised | User denied; staging admin deletes only disposable third account |
| `public.admin_delete_test_users()` | authenticated (anon denied) | Bulk-deletes non-admin auth accounts matching `lower(email) LIKE 'test%@%'` | Calls is_admin() | **High business risk**: email prefix can include legitimate clients; not bounded to staging fixtures | User denied; **admin-positive test deliberately NOT run** |
| `public.admin_get_user_details(uuid)` | authenticated (anon denied) | Returns profile, auth details and recent activity | Calls is_admin() before reading private data | Sensitive PII exposure if admin guard bypassed | User denied; admin reads only synthetic profile |

Supplementary callable RPC: `public.admin_analytics_summary()` is currently
**SECURITY INVOKER**, not definer. It calls `is_admin()` and queries RLS
protected analytics; test ordinary user denied/admin synthetic dashboard success.

Trigger functions: `public.handle_new_user()`,
`public.protect_profile_privileged_fields()` and
`private.guard_public_insert()` have `SECURITY DEFINER` but **no anon/auth
EXECUTE** on the audited metadata and are invoked through database triggers,
not direct public API routes. `private.allow_request(text,int,int)` is definer
and private; direct public RPC is unavailable.

## Security conclusions and release blockers

1. Verified live SQL has direct `TRUNCATE` grants to anon/auth on nine RLS
   tables; raw TRUNCATE bypasses RLS, though PostgREST does not expose a raw SQL
   `TRUNCATE` endpoint. Prepared narrow staged-only REVOKE and rollback are
   in `security/proposals/`; neither applied to production.
2. `is_admin()` is called by RLS even for anonymous/public policies. Keep
   current EXECUTE until a separately approved policy refactor passes real
   public and admin integration tests. Its `search_path` is safely empty.
3. Many admin definer functions set `search_path=public`. Current anon/auth
   lack `CREATE` on `public`; this reduces shadowing risk, but a future
   audited hardening could use an empty path and schema-qualified objects.
   Avoid untested automated rewrites.
4. Request-code generation via `random()` and the short admin-set password
   minimum merit separate approved staged migrations/tests. Do not silently
   change production auth rules.
5. Use fail-closed tests and no state changes in production. Successful synthetic
   mocked browser tests **do not establish** RPC privilege separation.
6. Genuine local network checks **passed on the isolated Ubuntu runner**.
   Six administrative RPCs deny anonymous calls through SQL privilege checks
   and ordinary-user calls through their exact application guards. Missing
   functions and unrelated server errors now fail the tests. Bulk deletion
   remains negative-tested only; no administrator-positive bulk call ran.
7. Google OAuth provider and redirect allowlist are not verified live. The
   React button only invokes `supabase.auth.signInWithOAuth` with
   `redirectTo: window.location.origin + '/'`. A separate OAuth app and
   exactly allowlisted staging origins are needed for true testing.

References:
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/redirect-urls
