#!/usr/bin/env bash
# 0xARK server startup script (no pm2 required)
# Usage: ./start.sh [stop|restart|status]

set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
LOGS="$REPO/logs"
mkdir -p "$LOGS"

BROKER_PID="$LOGS/broker.pid"
MP_PID="$LOGS/multiplayer.pid"

stop_server() {
  local pidfile="$1" name="$2"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
      echo "Stopped $name (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
}

status_server() {
  local pidfile="$1" name="$2"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      echo "$name: running (pid $pid)"
    else
      echo "$name: dead (stale pid $pid)"
    fi
  else
    echo "$name: not running"
  fi
}

case "${1:-start}" in
  stop)
    stop_server "$BROKER_PID" "x402-broker"
    stop_server "$MP_PID" "multiplayer"
    ;;
  status)
    status_server "$BROKER_PID" "x402-broker"
    status_server "$MP_PID" "multiplayer"
    ;;
  restart)
    "$0" stop
    sleep 1
    "$0" start
    ;;
  start)
    stop_server "$BROKER_PID" "x402-broker" 2>/dev/null || true
    stop_server "$MP_PID" "multiplayer" 2>/dev/null || true

    # Start x402 broker (ESM — needs node flag)
    cd "$REPO/x402"
    node agent-broker.js >> "$LOGS/broker.log" 2>> "$LOGS/broker-err.log" &
    echo $! > "$BROKER_PID"
    echo "Started x402-broker (pid $!)"

    # Start WebSocket multiplayer
    cd "$REPO/multiplayer"
    node server.js >> "$LOGS/multiplayer.log" 2>> "$LOGS/multiplayer-err.log" &
    echo $! > "$MP_PID"
    echo "Started multiplayer (pid $!)"

    echo ""
    echo "x402 broker:  http://localhost:3402/status"
    echo "Multiplayer:  ws://localhost:3000"
    echo "Logs:         $LOGS/"
    ;;
  *)
    echo "Usage: $0 [start|stop|restart|status]"
    exit 1
    ;;
esac
