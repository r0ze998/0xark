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
#  Checks & revives, in order:
#    1. validator      (solana cluster-version @ localhost) → restart if dead
#    2. program        (8CH9… executable) → NO-GO if absent
#    3. WS relay :3500  → restart from the clone that has multiplayer deps
#    4. client  :4200   → restart python3 http.server from solana/client
#    5. localnet patches (8CH9 in pda.js/config.js + localhost:8899 in rpc.js) → re-sed
#    6. chain sanity    (DuelState >=16 HARD; B energy + FPTM wins/rarity print-only, YKK-59)
#    7. print READY + browser steps, or NO-GO + reason
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
DEVNET_ID=5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN
B_WALLET=HcmnQXvyRysaZTqrNYAdputmjB9Z4XSXdYFrTTWrRTQL   # fixture wallet B (energy 0)
A_WALLET=78eQHYx1ckTSVREbK9mZnV32Ukx257XJ4U54x5eock6N   # fixture wallet A (10 wins)
CARD_MINT=FPTMMMYMXXYQ4L4FU1GgDLqPn8ZK4W1gf2UuGZ1cvpGk  # FPTM… fixture Common card mint

PORT_VALIDATOR=8899
PORT_RELAY=3500
PORT_CLIENT=4200

VALIDATOR_LOG=/tmp/e2e-validator.log
RELAY_LOG=/tmp/e2e-relay.log
CLIENT_LOG=/tmp/e2e-client.log

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

port_up() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
rpc_up()  { solana cluster-version -u localhost >/dev/null 2>&1; }
wait_for(){ # wait_for <predicate-fn> <arg> <secs>
  local fn=$1 arg=$2 secs=$3 i
  for ((i=1;i<=secs;i++)); do "$fn" "$arg" && return 0; sleep 1; done
  return 1
}

echo    "════════════════════════════════════════════════════════════"
echo    "  0xARK F1 e2e — session revive     $(date '+%Y-%m-%d %H:%M:%S')"
echo    "════════════════════════════════════════════════════════════"

# ── 1. validator ────────────────────────────────────────────────────────────
hdr "[1/6] validator (localhost:$PORT_VALIDATOR)"
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
hdr "[2/6] program $PROGRAM_ID"
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
hdr "[3/6] WS relay (localhost:$PORT_RELAY)"
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
hdr "[4/6] client (localhost:$PORT_CLIENT)"
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
hdr "[5/6] localnet patches (onchain split: pda.js + rpc.js + config.js)"
# YKK-15 split: PROGRAM_ID_STR now lives in src/onchain/pda.js, DEVNET_RPC in
# src/onchain/rpc.js (was onchain.js, deleted). config.js still holds PROGRAM_ID.
PDA_JS="$CLIENT_DIR/src/onchain/pda.js"
RPC_JS="$CLIENT_DIR/src/onchain/rpc.js"
CONFIG="$CLIENT_DIR/src/config.js"
patched() { # all three markers present?
  grep -q "$PROGRAM_ID" "$PDA_JS" \
    && grep -q "http://localhost:8899" "$RPC_JS" \
    && grep -q "$PROGRAM_ID" "$CONFIG"
}
if patched; then
  ok "already applied (8CH9 in pda.js/config.js + localhost:8899 in rpc.js)"
else
  warn "wiped — reapplying the two seds (program-id + rpc)"
  #  sed 1: devnet program id → localnet program id  (pda.js + config.js)
  sed -i '' "s/$DEVNET_ID/$PROGRAM_ID/g" "$PDA_JS" "$CONFIG"
  #  sed 2: devnet RPC → localhost                     (rpc.js)
  sed -i '' 's#https://api.devnet.solana.com#http://localhost:8899#g' "$RPC_JS"
  if patched; then
    ok "reapplied"
  else
    bad "seds did not take — inspect $PDA_JS / $RPC_JS / $CONFIG by hand"
  fi
fi

# ── 6. chain sanity ─────────────────────────────────────────────────────────
hdr "[6/6] chain sanity (fixtures intact?)"
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

# ── 7. verdict ──────────────────────────────────────────────────────────────
echo    ""
echo    "════════════════════════════════════════════════════════════"
if [ ${#NOGO[@]} -eq 0 ]; then
  printf '  \033[1;32m● GO — READY\033[0m\n'
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
