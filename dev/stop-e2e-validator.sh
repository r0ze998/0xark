#!/usr/bin/env bash
# dev/stop-e2e-validator.sh — clean shutdown for the parked F1 e2e validator.
#
# Sends SIGTERM and waits for the process to exit so RocksDB flushes its WAL
# and writes a final snapshot before stopping.
#
# NEVER use `pkill -9 solana-test-validator` or SIGKILL — that leaves the
# WAL unflushed and can corrupt the ledger (we learned this the hard way).
set -eu

PORT=8899
PID=$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1 || true)

if [ -z "${PID:-}" ]; then
  echo "no process listening on :$PORT — validator already stopped"
  exit 0
fi

echo "stopping validator pid $PID (SIGTERM) …"
kill -TERM "$PID"

i=0
while kill -0 "$PID" 2>/dev/null; do
  sleep 0.5
  i=$((i + 1))
  if [ $i -ge 60 ]; then
    echo "WARN: validator still alive after 30s — check $PID manually" >&2
    exit 1
  fi
done

echo "stopped (pid $PID exited cleanly)"
