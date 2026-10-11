#!/usr/bin/env bash
# Local-only SQL access through the exact synthetic Supabase Docker container.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EXPECTED="supabase_db_mama_i_malish_isolated_2026"
if ! command -v docker >/dev/null; then
  echo "BLOCKED: Docker CLI not available." >&2
  exit 2
fi
if [ -n "${DOCKER_HOST:-}" ] || [ -n "${DOCKER_CONTEXT:-}" ]; then
  echo "BLOCKED: Docker is configured via environment for a potentially remote daemon." >&2
  exit 2
fi
CONTEXT="$(docker context show)"
if [ "$CONTEXT" != "default" ] && [ "$CONTEXT" != "desktop-linux" ]; then
  echo "BLOCKED: Docker context is not a trusted local context." >&2
  exit 2
fi
ENDPOINT="$(docker context inspect "$CONTEXT" --format '{{.Endpoints.docker.Host}}')"
case "$ENDPOINT" in
  unix:///*|npipe:////./pipe/docker_engine) ;;
  *) echo "BLOCKED: Docker context endpoint is not a local socket." >&2; exit 2 ;;
esac
CONTAINER="$(docker ps --filter "name=^/${EXPECTED}$" --format '{{.Names}}')"
if [ "$CONTAINER" != "$EXPECTED" ]; then
  echo "BLOCKED: expected EXACT isolated DB container is not running." >&2
  exit 2
fi
fingerprint() {
  docker exec -i "$CONTAINER" psql -X -Atq -U postgres -d postgres -v ON_ERROR_STOP=1 \
    < "$SCRIPT_DIR/sql/invariant-fingerprint.sql"
}
assert_preserved() {
  if [ "$(fingerprint)" != "$BASELINE" ]; then
    echo "FAIL: non-TRUNCATE ACLs, RLS, functions or synthetic rows changed." >&2
    exit 1
  fi
  echo "PASS: other ACLs, RLS, functions and synthetic rows preserved."
}
BASELINE="$(fingerprint)"
if ! [[ "$BASELINE" =~ ^[a-f0-9]{32}$ ]]; then
  echo "BLOCKED: invariant fingerprint could not be read." >&2
  exit 2
fi
echo "Local-only ACL preflight..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-rpc.sql"
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-before.sql"
assert_preserved
echo "Local-only proposed REVOKE..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$REPO_ROOT/security/proposals/20261011_truncate_grants_up.sql"
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-after.sql"
assert_preserved
echo "Local-only rollback rehearsal..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$REPO_ROOT/security/proposals/20261011_truncate_grants_rollback.sql"
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-before.sql"
assert_preserved
echo "Restore hardened staging state after rollback test..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$REPO_ROOT/security/proposals/20261011_truncate_grants_up.sql"
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-after.sql"
assert_preserved
echo "PASS: local-only nine-table catalog/real TRUNCATE, RPC ACL, rollback and reapply."
