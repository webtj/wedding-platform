#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/wedding-platform-api"
ADMIN_DIR="$ROOT_DIR/wedding-platform-admin"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[wedding-platform]${NC} $1"; }
warn() { echo -e "${YELLOW}[wedding-platform]${NC} $1"; }
err() { echo -e "${RED}[wedding-platform]${NC} $1"; }

# Check if ports are in use
check_port() {
  local port=$1
  if lsof -ti:$port >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

# Kill process on port
kill_port() {
  local port=$1
  local pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

# Cleanup on exit
cleanup() {
  log "Shutting down..."
  kill_port 4000
  kill_port 3000
  log "Stopped."
}
trap cleanup EXIT INT TERM

# Check dependencies
if [ ! -d "$API_DIR/node_modules" ]; then
  err "API dependencies not installed. Run: cd wedding-platform-api && pnpm install"
  exit 1
fi

if [ ! -d "$ADMIN_DIR/node_modules" ]; then
  err "Admin dependencies not installed. Run: cd wedding-platform-admin && bun install"
  exit 1
fi

# Kill existing processes on ports
if check_port 4000; then
  warn "Port 4000 in use, killing..."
  kill_port 4000
fi

if check_port 3000; then
  warn "Port 3000 in use, killing..."
  kill_port 3000
fi

# Start API
log "Starting API on port 4000..."
cd "$API_DIR"
pnpm dev &
API_PID=$!

# Wait for API to be ready
log "Waiting for API..."
for i in $(seq 1 30); do
  if curl -s http://localhost:4000 >/dev/null 2>&1; then
    log "API ready."
    break
  fi
  if [ $i -eq 30 ]; then
    err "API failed to start within 30s"
    exit 1
  fi
  sleep 1
done

# Start Admin
log "Starting Admin on port 3000..."
cd "$ADMIN_DIR"
bun dev &
ADMIN_PID=$!

log "=========================================="
log "  Wedding Platform started!"
log "  Admin: http://localhost:3000"
log "  API:   http://localhost:4000"
log "  Press Ctrl+C to stop"
log "=========================================="

# Wait for background processes
wait
