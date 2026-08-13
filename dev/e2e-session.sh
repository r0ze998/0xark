#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  dev/e2e-session.sh — revive the PARKED F1 manual-e2e environment and print
#  GO / NO-GO.  One command.  Idempotent: safe to re-run; only revives what is
#  down.  NEVER MERGE — dev/f1-e2e-fixtures only.
#
#  ⚠  --reset IS FORBIDDEN.  The F1 fixtures (15 DuelStates, B energy 0, FPTM
#     card wins 10) live INSIDE ~/0xark/test-ledger.  `solana-test-validator
#     --reset` wipes that ledger and destroys every fixture.  This script starts
#     the validator WITHOUT --reset and hard-refuses if --reset leaks in.
#
#  ⚠  STOP THE VALIDATOR WITH dev/stop-e2e-validator.sh (SIGTERM + wait).
#     NEVER use `pkill -9` / SIGKILL — unflushed WAL = corrupted RocksDB.
#     This script backs up the newest snapshot on every GO so a hard-kill is
#     survivable, but the backup is the belt, not an excuse to skip the buckle.
#
#  Checks & revives, in order:
#    1. validator      (solana cluster-version @ localhost) → restart if dead
#    2. program        (8CH9… executable) → NO-GO if absent
#    3. WS relay :3500  → restart from the clone that has multiplayer deps
#    4. client  :4200   → restart python3 http.server from solana/client
#    5. localnet patches → delegates to dev/apply-localnet-patches.sh
#       (8CH9 in pda.js/config.js + localhost:8899 in rpc.js; --revert undoes)
#    6. chain sanity    (DuelState >=16 HARD; B energy + FPTM wins/rarity print-only, YKK-59)
#    7. auto-backup     (runs BEFORE the verdict so a shortfall annotates the
#                        banner; warning only — never blocks GO)
#    then: print READY + browser steps, or NO-GO + reason
# ─────────────────────────────────────────────────────────────────────────────
set -u

# ── constants (this ledger's ground truth) ──────────────────────────────────
ROOT=/Users/hiroprotagonist/0xark
RELAY_CLONE=/Users/hiroprotagonist/Projects/0xark      # only clone with multiplayer/node_modules
CLIENT_DIR="$ROOT/solana/client"
LEDGER="$ROOT/test-ledger"
FIXTURE_KEYS="$RELAY_CLONE/dev/fixture-keys"           # A.json / B.json (gitignored, throwaway)

RPC=http://localhost:8899
PROGRAM_ID=8CH9NtjP6iKSpc8A6RgyM1iD7bdxaKgSNSLaPaQQhx85
# DEVNET_ID moved to dev/apply-localnet-patches.sh — step 5 is the only thing
# that ever needed it, and that step now delegates.
B_WALLET=HcmnQXvyRysaZTqrNYAdputmjB9Z4XSXdYFrTTWrRTQL   # fixture wallet B (energy 0)
A_WALLET=78eQHYx1ckTSVREbK9mZnV32Ukx257XJ4U54x5eock6N   # fixture wallet A (10 wins)
CARD_MINT=FPTMMMYMXXYQ4L4FU1GgDLqPn8ZK4W1gf2UuGZ1cvpGk  # FPTM… fixture Common card mint

PORT_VALIDATOR=8899
PORT_RELAY=3500
PORT_CLIENT=4200

VALIDATOR_LOG=/tmp/e2e-validator.log
RELAY_LOG=/tmp/e2e-relay.log
CLIENT_LOG=/tmp/e2e-client.log

BACKUP_ROOT=~/0xark-ledger-backups   # outside working tree — survives git clean / rm -rf
BACKUP_KEEP=5                        # rolling window: oldest pruned beyond this

# ── --reset guard ───────────────────────────────────────────────────────────
for a in "$@"; do
  if [ "$a" = "--reset" ]; then
    echo "FATAL: --reset is FORBIDDEN — it would wipe the fixture ledger. Aborting." >&2
    exit 3
  fi
done

# ── output helpers ──────────────────────────────────────────────────────────
NOGO=()
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m…\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; NOGO+=("$1"); }
hdr()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
# bfail — a red ✗ that does NOT enter NOGO. Used only by auto_backup: the env
# being usable and the backup being complete are separate facts, so a backup
# shortfall annotates the verdict (see BACKUP_WARN) instead of blocking it.
bfail(){ printf '  \033[31m✗\033[0m %s\n' "$1"; }

port_up() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
rpc_up()  { solana cluster-version -u localhost >/dev/null 2>&1; }
wait_for(){ # wait_for <predicate-fn> <arg> <secs>
  local fn=$1 arg=$2 secs=$3 i
  for ((i=1;i<=secs;i++)); do "$fn" "$arg" && return 0; sleep 1; done
  return 1
}

# auto_backup — called on every successful GO.
# Copies the newest snapshot dir + .tar.zst + genesis + accounts to BACKUP_ROOT.
# Skips if that snapshot slot is already backed up. Prunes to BACKUP_KEEP dirs.
#
# Verifies before reporting success: .tar.zst + genesis.bin + bank file +
# a resolvable accounts_hardlinks symlink, and account-file count == live.
# On any shortfall it prints ✗ INCOMPLETE and returns 1 rather than a green ✓ —
# a backup that can't distinguish complete from partial is the failure this
# step exists to prevent.
#
# Restore procedure (scratch port :9099, scratch ledger $SCRATCH):
#   mkdir -p $SCRATCH/accounts/snapshot
#   cp <bdir>/genesis.bin <bdir>/genesis.tar.bz2 $SCRATCH/
#   cp <bdir>/snapshot-<slot>-*.tar.zst $SCRATCH/
#   cp -R <bdir>/snapshots $SCRATCH/
#   cp -R <bdir>/accounts/snapshot/<slot> $SCRATCH/accounts/snapshot/<slot>
#   # Repoint the hardlink at the SCRATCH accounts dir (it is absolute, so it
#   # currently points back into <bdir>; leaving it would boot off the backup):
#   ln -sfn $SCRATCH/accounts/snapshot/<slot> \
#     $SCRATCH/snapshots/<slot>/accounts_hardlinks/account_path_0
#   solana-test-validator --ledger $SCRATCH --rpc-port 9099 ...
#   # (the .tar.zst alone will NOT cold-restore — the runtime rejects it)
auto_backup() {
  local newest slot bdir size count excess d snapdir rc
  mkdir -p "$BACKUP_ROOT"
  newest=$(ls -t "$LEDGER"/snapshot-*.tar.zst 2>/dev/null | head -1)
  if [ -z "$newest" ]; then
    warn "auto-backup: no snapshot in $LEDGER — skipping"
    return
  fi
  slot=$(basename "$newest" | sed 's/snapshot-\([0-9]*\)-.*/\1/')
  # Already backed up this exact slot?
  if ls -d "$BACKUP_ROOT"/snap-"$slot"-* >/dev/null 2>&1; then
    ok "auto-backup: slot $slot already in $BACKUP_ROOT — skip"
    return
  fi
  bdir="$BACKUP_ROOT/snap-${slot}-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$bdir"
  rc=0
  cp "$newest"                   "$bdir/" || rc=1
  [ -f "$LEDGER/genesis.bin"      ] && { cp "$LEDGER/genesis.bin"     "$bdir/" || rc=1; }
  [ -f "$LEDGER/genesis.tar.bz2"  ] && { cp "$LEDGER/genesis.tar.bz2" "$bdir/" || rc=1; }
  # snapshots/ dir contains the bank serialization — required for restore
  # (.tar.zst alone is rejected by the Agave runtime on cold restore).
  #
  # The one expected cp failure: snapshots/<slot>/accounts_hardlinks/account_path_0
  # is a symlink to "test-ledger/accounts/snapshot/<slot>" — relative to the REPO
  # ROOT, not to the link's own directory, so it dangles from where cp reads it.
  # Swallow that one and recreate it absolutely below, which also makes the
  # backup self-contained (no hand-fix needed at restore time).
  snapdir="$LEDGER/snapshots/$slot"
  [ -d "$snapdir" ] && { cp -R "$LEDGER/snapshots" "$bdir/" 2>/dev/null || true; }
  [ -d "$LEDGER/accounts"         ] && { cp -R "$LEDGER/accounts" "$bdir/" || rc=1; }
  if [ -d "$bdir/accounts/snapshot/$slot" ] && [ -d "$bdir/snapshots/$slot" ]; then
    mkdir -p "$bdir/snapshots/$slot/accounts_hardlinks"
    ln -sfn "$bdir/accounts/snapshot/$slot" \
            "$bdir/snapshots/$slot/accounts_hardlinks/account_path_0" || rc=1
  fi

  # ── verify before claiming success ────────────────────────────────────────
  # A backup that cannot tell complete from partial is the failure this whole
  # step exists to prevent. Check the four artifacts a cold restore needs, and
  # that the account file count matches the live ledger.
  local live_n back_n
  [ -f "$bdir/$(basename "$newest")" ]                                  || { bfail "auto-backup: .tar.zst missing";        rc=1; }
  [ -f "$bdir/genesis.bin" ]                                            || { bfail "auto-backup: genesis.bin missing";     rc=1; }
  [ -f "$bdir/snapshots/$slot/$slot" ]                                  || { bfail "auto-backup: bank file missing";       rc=1; }
  [ -e "$bdir/snapshots/$slot/accounts_hardlinks/account_path_0" ]      || { bfail "auto-backup: hardlink unresolvable";   rc=1; }
  live_n=$(ls "$LEDGER/accounts/snapshot/$slot" 2>/dev/null | wc -l | tr -d ' ')
  back_n=$(ls "$bdir/accounts/snapshot/$slot"   2>/dev/null | wc -l | tr -d ' ')
  [ "$live_n" = "$back_n" ] || { bfail "auto-backup: account files $back_n/$live_n — PARTIAL"; rc=1; }

  size=$(du -sh "$bdir" 2>/dev/null | cut -f1)   # only used in the ✓ line
  if [ "$rc" -ne 0 ]; then
    bfail "auto-backup: slot $slot INCOMPLETE at $bdir — do NOT rely on it"
    printf '  \033[31m  a hard-kill is not survivable until this is fixed\033[0m\n'
    return 1
  fi
  ok "auto-backup: slot $slot → $bdir ($size, ${back_n} account files, restore-ready)"
  # Prune: keep the most recent BACKUP_KEEP entries, delete the rest
  count=$(ls -d "$BACKUP_ROOT"/snap-*/ 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -gt "$BACKUP_KEEP" ]; then
    excess=$(ls -dt "$BACKUP_ROOT"/snap-*/ | tail -n "+$((BACKUP_KEEP + 1))")
    for d in $excess; do rm -rf "$d" && warn "auto-backup: pruned $d"; done
  fi
}

echo    "════════════════════════════════════════════════════════════"
echo    "  0xARK F1 e2e — session revive     $(date '+%Y-%m-%d %H:%M:%S')"
echo    "════════════════════════════════════════════════════════════"

# ── 1. validator ────────────────────────────────────────────────────────────
hdr "[1/7] validator (localhost:$PORT_VALIDATOR)"
if rpc_up; then
  ok "already up — cluster-version $(solana cluster-version -u localhost 2>/dev/null)"
else
  warn "down — restarting solana-test-validator (NO --reset) from $ROOT"
  if [ ! -d "$LEDGER" ]; then
    bad "ledger $LEDGER missing — cannot revive fixtures (do NOT --reset to recreate)"
  else
    ( cd "$ROOT" && nohup solana-test-validator --ledger test-ledger >"$VALIDATOR_LOG" 2>&1 & )
    if wait_for rpc_up x 30; then
      ok "revived — cluster-version $(solana cluster-version -u localhost 2>/dev/null)  (log: $VALIDATOR_LOG)"
    else
      bad "validator did not come up within 30s (see $VALIDATOR_LOG)"
    fi
  fi
fi

# ── 2. program executable ───────────────────────────────────────────────────
hdr "[2/7] program $PROGRAM_ID"
if rpc_up; then
  SHOW=$(solana program show "$PROGRAM_ID" -u localhost 2>&1)
  if echo "$SHOW" | grep -q "Program Id: $PROGRAM_ID"; then
    ok "executable — $(echo "$SHOW" | grep -E 'Data Length' | sed 's/^ *//')"
  else
    bad "program not found / not executable on localnet"
  fi
else
  bad "validator down — cannot check program"
fi

# ── 3. WS relay :3500 ───────────────────────────────────────────────────────
hdr "[3/7] WS relay (localhost:$PORT_RELAY)"
if port_up "$PORT_RELAY"; then
  ok "already up"
elif [ ! -d "$RELAY_CLONE/multiplayer/node_modules" ]; then
  bad "no clone with multiplayer deps ($RELAY_CLONE/multiplayer/node_modules absent)"
else
  warn "down — starting from $RELAY_CLONE (the clone WITH multiplayer/node_modules)"
  ( cd "$RELAY_CLONE" && NODE_ENV=development nohup node multiplayer/server.js >"$RELAY_LOG" 2>&1 & )
  if wait_for port_up "$PORT_RELAY" 15; then
    ok "revived from $RELAY_CLONE  (demo mode; log: $RELAY_LOG)"
  else
    bad "relay did not bind :$PORT_RELAY within 15s (see $RELAY_LOG)"
  fi
fi

# ── 4. client :4200 ─────────────────────────────────────────────────────────
hdr "[4/7] client (localhost:$PORT_CLIENT)"
if port_up "$PORT_CLIENT"; then
  ok "already up"
else
  warn "down — starting python3 http.server from $CLIENT_DIR"
  ( cd "$CLIENT_DIR" && nohup python3 -m http.server "$PORT_CLIENT" >"$CLIENT_LOG" 2>&1 & )
  if wait_for port_up "$PORT_CLIENT" 10; then
    ok "revived  (log: $CLIENT_LOG)"
  else
    bad "client did not bind :$PORT_CLIENT within 10s (see $CLIENT_LOG)"
  fi
fi

# ── 5. localnet patches ─────────────────────────────────────────────────────
hdr "[5/7] localnet patches (onchain split: pda.js + rpc.js + config.js)"
# The seds themselves live in dev/apply-localnet-patches.sh — one source of
# truth, so `--revert` (needed before any commit or branch switch) can't drift
# from what this step applies. That script also refuses to guess when a target
# line matches neither the devnet nor the localnet value.
PATCH_SH="$ROOT/dev/apply-localnet-patches.sh"
if [ -x "$PATCH_SH" ]; then
  PATCH_OUT=$("$PATCH_SH" 2>&1); PATCH_RC=$?
  printf '%s\n' "$PATCH_OUT" | grep -v 'intentionally dirty'
  [ "$PATCH_RC" -eq 0 ] || bad "localnet patches failed (rc=$PATCH_RC) — see output above"
else
  bad "missing or non-executable: $PATCH_SH"
fi

# ── 6. chain sanity ─────────────────────────────────────────────────────────
hdr "[6/7] chain sanity (fixtures intact?)"
if rpc_up; then
  SANITY=$(cd "$ROOT" && node --input-type=module <<'NODE' 2>/tmp/e2e-sanity.err
import web3 from '@solana/web3.js';
const { Connection, PublicKey } = web3;
const RPC='http://localhost:8899';
const PROGRAM=new PublicKey('8CH9NtjP6iKSpc8A6RgyM1iD7bdxaKgSNSLaPaQQhx85');
const B=new PublicKey('HcmnQXvyRysaZTqrNYAdputmjB9Z4XSXdYFrTTWrRTQL');
const MINT=new PublicKey('FPTMMMYMXXYQ4L4FU1GgDLqPn8ZK4W1gf2UuGZ1cvpGk');
const ENC=new TextEncoder();
const conn=new Connection(RPC,'confirmed');
const pda=(s)=>PublicKey.findProgramAddressSync(s,PROGRAM)[0];
const info=(pk)=>conn.getAccountInfo(pk,'confirmed');
try{
  // B PlayerState energy  (vaultOff = d[169]==0?170:202 ; energy @ vaultOff+54)
  const psB=await info(pda([ENC.encode('player'),B.toBytes()]));
  let energy='MISSING';
  if(psB){const d=psB.data;const vo=d[169]===0?170:202;energy=d[vo+54];}
  // FPTM CardBattleHistory wins @40 (u32, after 8B disc)
  const cbh=await info(pda([ENC.encode('card_battle_history'),MINT.toBytes()]));
  const wins=cbh?cbh.data.readUInt32LE(40):'MISSING';
  // FPTM CardMintRecord rarity @41 (disc8 + mint32 + card_id1 + rarity1)
  const cmr=await info(pda([ENC.encode('card_mint_record'),MINT.toBytes()]));
  const rarity=cmr?cmr.data[41]:'MISSING';
  // DuelState count = program accounts of size 1624
  const all=await conn.getProgramAccounts(PROGRAM,{commitment:'confirmed'});
  const duels=all.filter(a=>a.account.data.length===1624).length;
  console.log(`ENERGY_B=${energy}`);
  console.log(`CBH_WINS=${wins}`);
  console.log(`CMR_RARITY=${rarity}`);
  console.log(`DUEL_COUNT=${duels}`);
}catch(e){console.log('SANITY_ERR='+(e.message||e));}
NODE
)
  ENERGY_B=$(echo "$SANITY"   | sed -n 's/^ENERGY_B=//p')
  CBH_WINS=$(echo "$SANITY"   | sed -n 's/^CBH_WINS=//p')
  CMR_RARITY=$(echo "$SANITY" | sed -n 's/^CMR_RARITY=//p')
  DUEL_COUNT=$(echo "$SANITY" | sed -n 's/^DUEL_COUNT=//p')
  SANITY_ERR=$(echo "$SANITY" | sed -n 's/^SANITY_ERR=//p')

  if [ -n "$SANITY_ERR" ]; then
    bad "sanity read failed: $SANITY_ERR (stderr: /tmp/e2e-sanity.err)"
  else
    # DuelState count: HARD blocker — 15 fixtures + >=1 real browser duel; grows
    # with every browser duel (F1 closed via duel 16). Assert >= 16.
    case "$DUEL_COUNT" in
      ''|*[!0-9]*) bad "DuelState count = ${DUEL_COUNT:-?} (expected >= 16, unreadable)" ;;
      *) [ "$DUEL_COUNT" -ge 16 ] && ok "DuelState count = $DUEL_COUNT (>= 16)" \
                                  || bad "DuelState count = $DUEL_COUNT (expected >= 16)" ;;
    esac
    # PRINT-ONLY (not hard-fails): B energy regenerates on a clock (any pinned value
    # goes stale); FPTM wins/rarity flip to their gate values only once YKK-59 lands.
    printf '  \033[36m·\033[0m B(Hcmn…) energy = %s  (print-only — regenerates on a clock)\n' "${ENERGY_B:-?}"
    printf '  \033[36m·\033[0m FPTM… CBH wins = %s    (expected: 10 until YKK-59 flips it)\n' "${CBH_WINS:-?}"
    printf '  \033[36m·\033[0m FPTM… CMR rarity = %s   (expected: 0 until YKK-59 flips it)\n' "${CMR_RARITY:-?}"
  fi
else
  bad "validator down — cannot read chain sanity"
fi

# ── 7. auto-backup ──────────────────────────────────────────────────────────
# Runs BEFORE the verdict so a shortfall can annotate the banner. The banner is
# the one line that actually gets read; a red ✗ printed underneath a green
# ● GO gets skimmed past, and a silently partial backup is the exact failure
# this step exists to catch.
#
# Annotation, not a blocker: the env being usable and the backup being complete
# are separate facts (auto_backup reports via bfail, which stays out of NOGO).
# Skipped entirely when the env is already NO-GO — backing up a broken ledger
# is not useful, and a second red line would only bury the real reason.
BACKUP_WARN=""
if [ ${#NOGO[@]} -eq 0 ]; then
  hdr "[7/7] auto-backup (snapshot → $BACKUP_ROOT)"
  auto_backup || BACKUP_WARN=$'  \033[1;33m(⚠ backup incomplete — see above)\033[0m'
fi

# ── verdict ─────────────────────────────────────────────────────────────────
echo    ""
echo    "════════════════════════════════════════════════════════════"
if [ ${#NOGO[@]} -eq 0 ]; then
  printf '  \033[1;32m● GO — READY\033[0m%s\n' "$BACKUP_WARN"
  echo  "════════════════════════════════════════════════════════════"
  cat <<STEPS

  Browser e2e:
    1. open  http://localhost:$PORT_CLIENT
    2. Phantom → import fixture wallet (localnet, throwaway secrets):
         B (energy 0)  : $B_WALLET   secret → $FIXTURE_KEYS/B.json
         A (10 wins)   : $A_WALLET   secret → $FIXTURE_KEYS/A.json
       set Phantom network → Custom RPC = $RPC
    3. verify on-chain truth:
         · wallet B energy HUD reads 0
         · FPTM… card ($CARD_MINT) shows PROMOTE gate ready (wins 10, Common→Uncommon)
         · 15 DuelStates on chain
  Services:  validator :$PORT_VALIDATOR · relay :$PORT_RELAY (demo) · client :$PORT_CLIENT
STEPS
  exit 0
else
  printf '  \033[1;31m● NO-GO\033[0m — %d blocker(s):\n' "${#NOGO[@]}"
  for r in "${NOGO[@]}"; do echo "      - $r"; done
  echo  "════════════════════════════════════════════════════════════"
  exit 1
fi
