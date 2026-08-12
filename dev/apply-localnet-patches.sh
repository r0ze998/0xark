#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  dev/apply-localnet-patches.sh — point the battle client at the LOCAL
#  validator, or put it back on devnet.  Single source of truth for the three
#  edits that make the parked F1 e2e env work.  NEVER MERGE the edits it makes.
#
#  These three lines are the ONLY difference between the committed (devnet)
#  client and the client the parked env serves on :4200:
#
#    src/onchain/pda.js   PROGRAM_ID_STR  5i37…  →  8CH9…
#    src/config.js        PROGRAM_ID      5i37…  →  8CH9…
#    src/onchain/rpc.js   DEVNET_RPC      https://api.devnet.solana.com
#                                              →  http://localhost:8899
#
#  WHY A SCRIPT AND NOT A STASH / BRANCH:
#    The patched files must never be committed — committing them would ship a
#    client that points at a localhost validator nobody else runs.  So the edits
#    live only in the working tree, which makes them casualties of any branch
#    switch.  Parking them in `git stash` "works" until the stash is dropped,
#    cleaned, or simply forgotten, and a lost stash is silent: the client keeps
#    serving, it just talks to devnet and every fixture read comes back empty.
#    Regenerating is cheap and total, so regenerate.  cf. the same
#    rebuild-vs-restore call in dev/e2e-session.sh's auto_backup — except here
#    the rebuild genuinely is possible, so there is no reason to keep a backup.
#
#  USAGE
#    dev/apply-localnet-patches.sh            # apply  (idempotent)
#    dev/apply-localnet-patches.sh --revert   # back to devnet, before a commit
#    dev/apply-localnet-patches.sh --check    # report only, change nothing
#
#  EXIT CODES
#    0  desired state reached (or --check found it already)
#    1  --check found the wrong state, or a sed did not take
#    2  DRIFT: a target line matches neither the devnet nor the localnet value.
#       Someone edited it by hand.  Refuses to guess — fix it yourself.
#    3  usage error / missing file
# ─────────────────────────────────────────────────────────────────────────────
set -u

ROOT=/Users/hiroprotagonist/0xark
CLIENT_DIR="$ROOT/solana/client"

PDA_JS="$CLIENT_DIR/src/onchain/pda.js"
RPC_JS="$CLIENT_DIR/src/onchain/rpc.js"
CONFIG="$CLIENT_DIR/src/config.js"

LOCAL_ID=8CH9NtjP6iKSpc8A6RgyM1iD7bdxaKgSNSLaPaQQhx85    # localnet deploy
DEVNET_ID=5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN    # committed value
LOCAL_RPC='http://localhost:8899'
DEVNET_RPC='https://api.devnet.solana.com'

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m…\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }

MODE=apply
case "${1-}" in
  '')        MODE=apply  ;;
  --revert)  MODE=revert ;;
  --check)   MODE=check  ;;
  -h|--help) sed -n '2,35p' "$0"; exit 0 ;;
  *)         echo "usage: $(basename "$0") [--revert|--check]" >&2; exit 3 ;;
esac

for f in "$PDA_JS" "$RPC_JS" "$CONFIG"; do
  [ -f "$f" ] || { bad "missing: $f"; exit 3; }
done

# ── drift guard ─────────────────────────────────────────────────────────────
# Every target must currently hold EITHER the devnet or the localnet value.
# Anything else means the line moved or was hand-edited, and a blind sed would
# either silently no-op or clobber it. Bail and say which one.
drift=0
check_pair() { # <file> <local-value> <devnet-value> <label>
  grep -qF "$2" "$1" || grep -qF "$3" "$1" || {
    bad "DRIFT: $4 in $(basename "$1") is neither localnet nor devnet value"
    drift=1
  }
}
check_pair "$PDA_JS" "$LOCAL_ID"  "$DEVNET_ID"  "PROGRAM_ID_STR"
check_pair "$CONFIG" "$LOCAL_ID"  "$DEVNET_ID"  "PROGRAM_ID"
check_pair "$RPC_JS" "$LOCAL_RPC" "$DEVNET_RPC" "DEVNET_RPC"
[ "$drift" -eq 0 ] || {
  echo "" >&2
  echo "Refusing to patch — inspect the three files by hand, then re-run." >&2
  exit 2
}

# ── state predicates ────────────────────────────────────────────────────────
is_localnet() {
  grep -qF "$LOCAL_ID" "$PDA_JS" \
    && grep -qF "$LOCAL_ID" "$CONFIG" \
    && grep -qF "$LOCAL_RPC" "$RPC_JS"
}
is_devnet() {
  grep -qF "$DEVNET_ID" "$PDA_JS" \
    && grep -qF "$DEVNET_ID" "$CONFIG" \
    && grep -qF "$DEVNET_RPC" "$RPC_JS"
}

to_localnet() {
  sed -i '' "s/$DEVNET_ID/$LOCAL_ID/g"       "$PDA_JS" "$CONFIG"
  sed -i '' "s#$DEVNET_RPC#$LOCAL_RPC#g"     "$RPC_JS"
}
to_devnet() {
  sed -i '' "s/$LOCAL_ID/$DEVNET_ID/g"       "$PDA_JS" "$CONFIG"
  sed -i '' "s#$LOCAL_RPC#$DEVNET_RPC#g"     "$RPC_JS"
}

# ── dispatch ────────────────────────────────────────────────────────────────
case "$MODE" in
  check)
    if is_localnet;  then ok   "LOCALNET — 8CH9 in pda.js/config.js, :8899 in rpc.js"; exit 0
    elif is_devnet;  then warn "DEVNET — committed state, client will NOT see the fixture ledger"; exit 1
    else                  bad  "MIXED — some files patched, some not"; exit 1; fi
    ;;
  apply)
    if is_localnet; then
      ok "already localnet (8CH9 in pda.js/config.js + localhost:8899 in rpc.js)"
    else
      warn "applying localnet patches"
      to_localnet
      if is_localnet; then ok "applied"
      else bad "seds did not take — inspect $PDA_JS / $RPC_JS / $CONFIG"; exit 1; fi
    fi
    echo "  (working tree is now intentionally dirty — do NOT commit these three files)"
    ;;
  revert)
    if is_devnet; then
      ok "already devnet (committed state)"
    else
      warn "reverting to devnet"
      to_devnet
      if is_devnet; then ok "reverted — safe to commit / switch branches"
      else bad "seds did not take — inspect $PDA_JS / $RPC_JS / $CONFIG"; exit 1; fi
    fi
    ;;
esac
