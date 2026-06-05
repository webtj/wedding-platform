#!/bin/bash
set -e
set -o pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/wedding-platform-api"
ADMIN_DIR="$ROOT_DIR/wedding-platform-admin"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[test]${NC} $1"; }
warn() { echo -e "${YELLOW}[test]${NC} $1"; }
err() { echo -e "${RED}[test]${NC} $1"; }
header() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}\n"; }

TOTAL_PASS=0
TOTAL_FAIL=0

run_test() {
  local name=$1
  local dir=$2
  local cmd=$3

  header "$name"
  cd "$dir"

  if eval "$cmd"; then
    log "$name: PASSED"
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    err "$name: FAILED"
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
}

# API unit tests
run_test "API Unit Tests" "$API_DIR" "pnpm test"

# Admin type check
run_test "Admin Type Check" "$ADMIN_DIR" "bun run build"

# Summary
header "Test Summary"
echo -e "  Passed: ${GREEN}$TOTAL_PASS${NC}"
echo -e "  Failed: ${RED}$TOTAL_FAIL${NC}"

if [ $TOTAL_FAIL -gt 0 ]; then
  err "Some tests failed!"
  exit 1
else
  log "All tests passed!"
  exit 0
fi
