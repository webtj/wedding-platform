#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/wedding-platform-api"
ADMIN_DIR="$ROOT_DIR/wedding-platform-admin"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[build]${NC} $1"; }
err() { echo -e "${RED}[build]${NC} $1"; }
header() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}\n"; }

header "Building API"
cd "$API_DIR"
pnpm build
log "API build complete."

header "Building Admin"
cd "$ADMIN_DIR"
bun run build
log "Admin build complete."

header "Build Summary"
log "API dist:  $API_DIR/dist/"
log "Admin:     $ADMIN_DIR/.next/"
log "Build succeeded!"
