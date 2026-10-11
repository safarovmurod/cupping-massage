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
CONTAINER="$(docker ps --filter "name=^/${EXPECTED}$" --format '{{.Names}}')"
if [ "$CONTAINER" != "$EXPECTED" ]; then
  echo "BLOCKED: expected EXACT isolated DB container is not running." >&2
  exit 2
fi
echo "Local-only ACL preflight..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-before.sql"
echo "Local-only proposed REVOKE..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$REPO_ROOT/security/proposals/20261011_truncate_grants_up.sql"
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-after.sql"
echo "Local-only rollback rehearsal..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$REPO_ROOT/security/proposals/20261011_truncate_grants_rollback.sql"
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-before.sql"
echo "Restore hardened staging state after rollback test..."
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$REPO_ROOT/security/proposals/20261011_truncate_grants_up.sql"
docker exec -i "$CONTAINER" psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 < "$SCRIPT_DIR/sql/assert-after.sql"
echo "PASS: local-only nine-table grants, rollback and reapply."
