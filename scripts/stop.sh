#!/bin/bash

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[wedding-platform]${NC} $1"; }
warn() { echo -e "${YELLOW}[wedding-platform]${NC} $1"; }

kill_port() {
  local port=$1
  local name=$2
  local pid=$(lsof -ti:$port 2>/dev/null)
  if [ -n "$pid" ]; then
    kill -9 $pid 2>/dev/null || true
    log "Stopped $name (port $port)"
  else
    warn "$name (port $port) not running"
  fi
}

kill_port 4000 "API"
kill_port 3000 "Admin"

log "All services stopped."
