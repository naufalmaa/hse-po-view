#!/usr/bin/env bash
# Create/refresh the throw-away DB used by the CSMS-AI e2e (a copy of the demo DB).
# The e2e overwrites ai_score/ai_reasoning, so never point it at safeview_hse_demo itself.
# Uses dump/restore (not CREATE DATABASE ... TEMPLATE) so open GUI sessions on the source DB do not block it.
# Usage: PGPASSWORD=... bash cypress/scripts/prepare-test-db.sh
set -euo pipefail
export PGHOST="${PGHOST:-localhost}" PGUSER="${PGUSER:-postgres}"
SRC="${E2E_SRC_DB:-safeview_hse_demo}" DST="${E2E_DB:-safeview_hse_test}"
case "$DST" in *test*) ;; *) echo "DST must contain 'test'"; exit 1;; esac
psql -d postgres -c "DROP DATABASE IF EXISTS $DST WITH (FORCE);"
psql -d postgres -c "CREATE DATABASE $DST;"
pg_dump -Fc -d "$SRC" | pg_restore --no-owner -d "$DST"
# throw-away uploads copy (spec 06 overwrites a few PDFs with negative controls)
UP="${E2E_UPLOADS_SRC:-$(cd "$(dirname "$0")/../../../../backend/phe-view-hse" && pwd)/uploads_demo}"
rm -rf "${UP%_demo}_test" && cp -r "$UP" "${UP%_demo}_test"
echo "ready: $DST (copy of $SRC) + ${UP%_demo}_test"
