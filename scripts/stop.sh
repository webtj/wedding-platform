#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[wedding-platform]${NC} $1"; }
warn() { echo -e "${YELLOW}[wedding-platform]${NC} $1"; }
err() { echo -e "${RED}[wedding-platform]${NC} $1"; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT_DIR/.run/wedding-platform"

is_pid_running() {
  local pid=$1
  [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1
}

stop_pid_file() {
  local file=$1
  local name=$2
  if [ ! -f "$file" ]; then
    warn "$name pid file not found: $file"
    return 1
  fi

  local pid
  pid=$(cat "$file" 2>/dev/null || true)
  if ! is_pid_running "$pid"; then
    warn "$name pid $pid not running, cleaning pid file"
    rm -f "$file"
    return 1
  fi

  kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    if ! is_pid_running "$pid"; then break; fi
    sleep 0.1
  done
  if is_pid_running "$pid"; then
    kill -9 "$pid" 2>/dev/null || true
  fi

  if is_pid_running "$pid"; then
    err "Failed to stop $name (pid $pid)"
    return 1
  fi
  rm -f "$file"
  log "Stopped $name (pid $pid)"
}

kill_port() {
  local port=$1
  local pids
  pids=$(lsof -ti:"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    log "Killed process(es) on port $port"
  fi
}

# ── Try PID files first ──
stop_pid_file "$RUN_DIR/api.pid" "API" || true
stop_pid_file "$RUN_DIR/admin.pid" "Admin" || true

# ── Fallback: kill anything still on the project ports ──
kill_port 4000
kill_port 3000

if [ -d "$RUN_DIR" ] && [ -z "$(ls -A "$RUN_DIR" 2>/dev/null)" ]; then
  rmdir "$RUN_DIR" 2>/dev/null || true
fi

log "Done."
