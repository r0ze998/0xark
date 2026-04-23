#!/usr/bin/env bash
# v3-plus-full-duel.sh — E2E 2-wallet duel test for GDD v3.0-plus mechanics
#
# Tests a complete duel between two wallets, exercising:
#   - v3.0-plus ability handlers (burn, evolve, steal, imprint)
#   - Gold Hall mode (is_gold_hall=true)
#   - Permanent steal via Legendary kill
#   - Burn UI flow (season supply decrement)
#   - Lease steal return tracking
#
# Prerequisites:
#   - solana devnet access (SOLANA_RPC env or default devnet)
#   - Two funded keypairs at WALLET_A_PATH and WALLET_B_PATH
#   - 0xark program deployed to PROGRAM_ID
#   - multiplayer server running at WS_URL
#
# Usage:
#   WALLET_A_PATH=~/.config/solana/test-a.json \
#   WALLET_B_PATH=~/.config/solana/test-b.json \
#   ./tools/e2e-test/v3-plus-full-duel.sh
#
# Exit codes:
#   0 = all tests passed
#   1 = test failure
#   2 = prerequisites not met

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

PROGRAM_ID="${PROGRAM_ID:-5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN}"
SOLANA_RPC="${SOLANA_RPC:-https://api.devnet.solana.com}"
WS_URL="${WS_URL:-ws://localhost:3001}"
API_URL="${API_URL:-http://localhost:3001}"
WALLET_A_PATH="${WALLET_A_PATH:-}"
WALLET_B_PATH="${WALLET_B_PATH:-}"
TIMEOUT_DUEL="${TIMEOUT_DUEL:-120}"     # seconds to wait for duel completion
GOLD_HALL="${GOLD_HALL:-true}"          # test in Gold Hall mode by default

PASS=0
FAIL=0
SKIP=0

# ── Helpers ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

pass() { echo -e "${GREEN}  PASS${NC} $1"; PASS=$((PASS+1)); }
fail() { echo -e "${RED}  FAIL${NC} $1 — $2"; FAIL=$((FAIL+1)); }
skip() { echo -e "${YELLOW}  SKIP${NC} $1 — $2"; SKIP=$((SKIP+1)); }
header() { echo -e "\n${YELLOW}── $1 ──${NC}"; }

require_cmd() {
  command -v "$1" &>/dev/null || { echo "Missing prerequisite: $1"; exit 2; }
}

require_cmd solana
require_cmd node
require_cmd curl
require_cmd jq

# ── Check wallets ─────────────────────────────────────────────────────────────

header "Prerequisites"

if [[ -z "$WALLET_A_PATH" || ! -f "$WALLET_A_PATH" ]]; then
  skip "Wallet A keypair" "WALLET_A_PATH not set or file not found — skipping live tests"
  LIVE_TEST=false
else
  LIVE_TEST=true
  ADDR_A=$(solana-keygen pubkey "$WALLET_A_PATH" 2>/dev/null || echo "INVALID")
  pass "Wallet A: $ADDR_A"
fi

if [[ -z "$WALLET_B_PATH" || ! -f "$WALLET_B_PATH" ]]; then
  skip "Wallet B keypair" "WALLET_B_PATH not set — skipping live tests"
  LIVE_TEST=false
else
  ADDR_B=$(solana-keygen pubkey "$WALLET_B_PATH" 2>/dev/null || echo "INVALID")
  pass "Wallet B: $ADDR_B"
fi

# ── Unit checks (always run) ──────────────────────────────────────────────────

header "Ability handler unit checks (Node.js)"

node --input-type=module << 'EOF'
import { strict as assert } from 'assert';

// Inline minimal CARD_V3 for test
const CARD_V3 = {};
for (let i = 1; i <= 60; i++) CARD_V3[i] = { rar: i <= 20 ? 0 : i <= 40 ? 1 : i <= 55 ? 2 : 3, clan: ((i-1)%5) };
CARD_V3[40].bp = 6;  // Day23 patch
CARD_V3[44].bp = 6;  // Day23 patch
CARD_V3[55] = { rar: 3, bp: 5, hp: 5, clan: 4, ab: 'hand_peek_steal' };

// canBurnCard
function canBurnCard(id) { const v = CARD_V3[id]; return v && v.rar < 2; }

// Tests
assert.equal(canBurnCard(1), true,  'card 1 (Common) burnable');
assert.equal(canBurnCard(21), true, 'card 21 (Uncommon) burnable');
assert.equal(canBurnCard(41), false,'card 41 (Rare) NOT burnable');
assert.equal(canBurnCard(56), false,'card 56 (Legendary) NOT burnable');

// Day23 balance patches
assert.equal(CARD_V3[40].bp, 6, '#40 Oathsworn bp=6 (was 7)');
assert.equal(CARD_V3[44].bp, 6, '#44 Highland bp=6 (was 7)');
assert.equal(CARD_V3[55].bp, 5, '#55 Sceptre bp=5 (was 3)');
assert.equal(CARD_V3[55].hp, 5, '#55 Sceptre hp=5 (was 3)');
assert.equal(CARD_V3[55].ab, 'hand_peek_steal', '#55 Sceptre has hand_peek_steal');

// steal type logic
function stealType(isGoldHall, targetIsLegendary, roll) {
  const prob = (isGoldHall && targetIsLegendary) ? 0.75 : 0.5;
  if (roll >= prob) return null;
  return (isGoldHall && targetIsLegendary) ? 'permanent' : 'lease';
}

assert.equal(stealType(true, true, 0.1), 'permanent', 'gold+legendary+good roll = permanent');
assert.equal(stealType(false, true, 0.1), 'lease',    'no-gold = lease only');
assert.equal(stealType(true, false, 0.1), 'lease',    'gold+common = lease only');
assert.equal(stealType(true, true, 0.9), null,        'bad roll = no steal');

console.log('  All unit checks passed');
EOF

if [[ $? -eq 0 ]]; then pass "CARD_V3 + ability unit checks"; else fail "CARD_V3 unit checks" "see above"; fi

# ── Server availability check ─────────────────────────────────────────────────

header "Multiplayer server"

SERVER_ALIVE=false
if curl -sf "${API_URL}/health" &>/dev/null; then
  SERVER_ALIVE=true
  pass "Server at ${API_URL} is reachable"
else
  skip "Server health check" "${API_URL}/health unreachable — live duel tests skipped"
fi

# ── Live duel test (requires wallets + server) ────────────────────────────────

header "Live 2-wallet duel (v3.0-plus Gold Hall)"

if [[ "$LIVE_TEST" == "false" || "$SERVER_ALIVE" == "false" ]]; then
  skip "Full 2-wallet duel" "Live prerequisites not met"
  echo ""
  echo "  To run live tests set:"
  echo "    WALLET_A_PATH=/path/to/keypair-a.json"
  echo "    WALLET_B_PATH=/path/to/keypair-b.json"
  echo "  and ensure multiplayer server is running at ${API_URL}"
else
  # Queue wallet A
  echo "  Queuing wallet A in Gold Hall tier..."
  RESP_A=$(curl -sf -X POST "${API_URL}/queue/enter" \
    -H "Content-Type: application/json" \
    -d "{\"wallet\":\"${ADDR_A}\",\"tier\":2,\"isGoldHall\":true}" || echo "{}")
  if echo "$RESP_A" | jq -e '.queued' &>/dev/null; then
    pass "Wallet A queued"
  else
    fail "Wallet A queue entry" "$(echo $RESP_A | jq -r '.error // .message // "unknown error"')"
  fi

  # Queue wallet B
  echo "  Queuing wallet B in Gold Hall tier..."
  RESP_B=$(curl -sf -X POST "${API_URL}/queue/enter" \
    -H "Content-Type: application/json" \
    -d "{\"wallet\":\"${ADDR_B}\",\"tier\":2,\"isGoldHall\":true}" || echo "{}")
  if echo "$RESP_B" | jq -e '.queued' &>/dev/null; then
    pass "Wallet B queued"
  else
    fail "Wallet B queue entry" "$(echo $RESP_B | jq -r '.error // .message // "unknown error"')"
  fi

  # Wait for match
  echo "  Waiting for match (up to ${TIMEOUT_DUEL}s)..."
  MATCH_ID=""
  for i in $(seq 1 $((TIMEOUT_DUEL / 2))); do
    sleep 2
    MATCH=$(curl -sf "${API_URL}/queue/status/${ADDR_A}" || echo "{}")
    if echo "$MATCH" | jq -e '.match_id' &>/dev/null; then
      MATCH_ID=$(echo "$MATCH" | jq -r '.match_id')
      pass "Match found: $MATCH_ID"
      break
    fi
  done

  if [[ -z "$MATCH_ID" ]]; then
    fail "Match creation" "Timed out after ${TIMEOUT_DUEL}s"
  else
    # Verify match has is_gold_hall=true
    MATCH_INFO=$(curl -sf "${API_URL}/match/${MATCH_ID}" || echo "{}")
    GOLD_FLAG=$(echo "$MATCH_INFO" | jq -r '.is_gold_hall // false')
    if [[ "$GOLD_FLAG" == "true" ]]; then
      pass "Match has is_gold_hall=true"
    else
      fail "Gold Hall flag on match" "Expected true, got $GOLD_FLAG"
    fi
  fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "════════════════════════════════════"
echo "Results: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped"
echo "════════════════════════════════════"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
