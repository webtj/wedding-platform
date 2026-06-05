#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT_DIR/wedding-platform-api"
ADMIN_DIR="$ROOT_DIR/wedding-platform-admin"
RUN_DIR="$ROOT_DIR/.run/wedding-platform"
API_PID_FILE="$RUN_DIR/api.pid"
ADMIN_PID_FILE="$RUN_DIR/admin.pid"

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

is_pid_running() {
  local pid=$1
  if [ -z "$pid" ]; then
    return 1
  fi
  if kill -0 "$pid" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

graceful_stop_pid() {
  local pid=$1
  if ! is_pid_running "$pid"; then
    return 0
  fi
  kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    if ! is_pid_running "$pid"; then
      return 0
    fi
    sleep 0.1
  done
  kill -9 "$pid" 2>/dev/null || true
}

stop_from_pid_file() {
  local file=$1
  if [ -f "$file" ]; then
    local pid
    pid=$(cat "$file" 2>/dev/null || true)
    graceful_stop_pid "$pid"
    rm -f "$file"
  fi
}

ensure_port_available_or_exit() {
  local port=$1
  local name=$2
  if check_port "$port"; then
    err "Port $port for $name is already occupied by another process."
    err "Please stop that process manually, then rerun ./scripts/start.sh."
    exit 1
  fi
}

# Cleanup on exit
cleanup() {
  log "Shutting down..."
  stop_from_pid_file "$API_PID_FILE"
  stop_from_pid_file "$ADMIN_PID_FILE"
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

mkdir -p "$RUN_DIR"

# stop stale pids from previous same-project runs only
stop_from_pid_file "$API_PID_FILE"
stop_from_pid_file "$ADMIN_PID_FILE"

# refuse to kill unknown processes on shared machine
ensure_port_available_or_exit 4000 "API"
ensure_port_available_or_exit 3000 "Admin"

# Start API
log "Starting API on port 4000..."
cd "$API_DIR"
pnpm dev &
API_PID=$!
echo "$API_PID" >"$API_PID_FILE"

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
echo "$ADMIN_PID" >"$ADMIN_PID_FILE"

log "=========================================="
log "  Wedding Platform started!"
log "  Admin: http://localhost:3000"
log "  API:   http://localhost:4000"
log "  Press Ctrl+C to stop"
log "=========================================="

# Wait for background processes
wait
