#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  dev/devnet-session.sh — DEVNET analog of dev/e2e-session.sh.
#
#  The devnet e2e track runs from ANY machine (MacBook) via Phantom's devnet
#  against the program deployed at 5i37… — no local validator/relay/client.
#  This script is a read-only CHECK + GUIDE: it inspects devnet state and prints
#  the EXACT commands r0ze must run (deploy signing + airdrops need r0ze's keys).
#
#  ⚠  HARD GUARD: this script targets DEVNET ONLY. It never talks to localhost
#     and never touches the parked localnet e2e (:8899 ledger / :3500 / :4200).
#     Those stay UNTOUCHABLE — run dev/e2e-session.sh for that track.
# ─────────────────────────────────────────────────────────────────────────────
set -u

# ── constants ────────────────────────────────────────────────────────────────
RPC=https://api.devnet.solana.com
PROGRAM_ID=5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN   # canonical devnet id (Anchor.toml + declare_id + client config)
ADMIN=DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R        # ADMIN_PUBKEY == r0ze's id.json (deploy authority + fixture admin)
B_WALLET=HcmnQXvyRysaZTqrNYAdputmjB9Z4XSXdYFrTTWrRTQL     # fixture wallet B (energy 0)  — reused from localnet fixture-keys
A_WALLET=78eQHYx1ckTSVREbK9mZnV32Ukx257XJ4U54x5eock6N     # fixture wallet A (10 wins)
FIXTURE_KEYS=/Users/hiroprotagonist/Projects/0xark/dev/fixture-keys   # A.json / B.json (throwaway secrets, gitignored)
FIXTURE_SO=/Users/hiroprotagonist/0xark/solana/oxark/target/deploy/oxark.so
EXPECT_BYTES=1212840   # size of the fresh anchor-built v0 program

# ── localhost / :8899 guard (refuse to ever hit the localnet track) ──────────
case "$RPC" in
  *localhost*|*127.0.0.1*|*:8899*) echo "FATAL: devnet script must NEVER target localhost. Aborting." >&2; exit 3 ;;
esac

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m…\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; }
hdr()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
TODO=()

echo    "════════════════════════════════════════════════════════════"
echo    "  0xARK DEVNET e2e — state check + r0ze punch-list   $(date '+%Y-%m-%d %H:%M:%S')"
echo    "  RPC: $RPC   program: $PROGRAM_ID"
echo    "════════════════════════════════════════════════════════════"

# ── 1. program deployed on devnet? ───────────────────────────────────────────
hdr "[1/4] program on devnet"
SHOW=$(solana program show "$PROGRAM_ID" --url "$RPC" 2>&1)
if echo "$SHOW" | grep -q "Program Id: $PROGRAM_ID"; then
  LEN=$(echo "$SHOW" | grep "Data Length" | grep -oE "[0-9]+" | head -1)
  AUTH=$(echo "$SHOW" | grep "Authority" | awk '{print $2}')
  ok "deployed — Data Length: ${LEN} bytes · Authority: ${AUTH}"
  if [ "$LEN" != "$EXPECT_BYTES" ]; then
    warn "deployed size ${LEN} != fresh v0 build ${EXPECT_BYTES} — UPGRADE recommended (see punch-list)"
    TODO+=("UPGRADE the devnet program to the fresh v0 build (size mismatch $LEN vs $EXPECT_BYTES):|solana program deploy $FIXTURE_SO --program-id $PROGRAM_ID --url $RPC --upgrade-authority ~/.config/solana/id.json")
  fi
  [ "$AUTH" = "$ADMIN" ] || warn "authority $AUTH != expected admin $ADMIN"
else
  bad "NOT deployed at $PROGRAM_ID on devnet"
  TODO+=("DEPLOY the v0 program to devnet (r0ze's key signs):|solana program deploy $FIXTURE_SO --program-id $PROGRAM_ID --url $RPC")
fi

# ── 2. fixture wallets + airdrops ────────────────────────────────────────────
hdr "[2/4] fixture wallets (throwaway — import secrets into Phantom @ devnet)"
echo  "    B (energy 0) : $B_WALLET   secret → $FIXTURE_KEYS/B.json"
echo  "    A (10 wins)  : $A_WALLET   secret → $FIXTURE_KEYS/A.json"
echo  "    admin        : $ADMIN   (r0ze id.json — pays deploy + fixture txns)"
for label_pk in "admin:$ADMIN" "A:$A_WALLET" "B:$B_WALLET"; do
  lbl=${label_pk%%:*}; pk=${label_pk#*:}
  bal=$(solana balance "$pk" --url "$RPC" 2>/dev/null | grep -oE "^[0-9.]+" | head -1)
  bal=${bal:-0}
  if awk "BEGIN{exit !($bal < 0.5)}"; then
    warn "$lbl $pk : ${bal} SOL — needs airdrop"
    TODO+=("AIRDROP devnet SOL to $lbl ($pk):|solana airdrop 2 $pk --url $RPC   # repeat if rate-limited; deploy needs ~8-9 SOL on admin")
  else
    ok "$lbl balance ${bal} SOL"
  fi
done

# ── 3. chain sanity (devnet fixtures) ────────────────────────────────────────
hdr "[3/4] chain sanity (devnet fixtures — same 4 values as localnet)"
SANITY=$(cd /Users/hiroprotagonist/0xark && node --input-type=module <<'NODE' 2>/tmp/devnet-sanity.err
import web3 from '@solana/web3.js';
const { Connection, PublicKey } = web3;
const RPC='https://api.devnet.solana.com';
const PROGRAM=new PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const B=new PublicKey('HcmnQXvyRysaZTqrNYAdputmjB9Z4XSXdYFrTTWrRTQL');
const ENC=new TextEncoder();
const conn=new Connection(RPC,'confirmed');
const pda=(s)=>PublicKey.findProgramAddressSync(s,PROGRAM)[0];
const info=(pk)=>conn.getAccountInfo(pk,'confirmed');
try{
  // B PlayerState energy (deterministic: pda(['player',B])); vaultOff=d[169]==0?170:202; energy@vaultOff+54
  const psB=await info(pda([ENC.encode('player'),B.toBytes()]));
  let energy = psB ? (()=>{const d=psB.data;const vo=d[169]===0?170:202;return d[vo+54];})() : 'ABSENT';
  console.log(`ENERGY_B=${energy}`);
  // DuelState count + fixture card (via getProgramAccounts — may be blocked on public devnet RPC)
  try{
    const all=await conn.getProgramAccounts(PROGRAM,{commitment:'confirmed'});
    const duels=all.filter(a=>a.account.data.length===1624).length;
    console.log(`DUEL_COUNT=${duels}`);
    // CardMintRecord (size 43): disc8+mint32+card_id1+rarity1; find the one whose CBH wins>=10
    const cmrs=all.filter(a=>a.account.data.length===43);
    let found=null;
    for(const a of cmrs){const mint=new PublicKey(a.account.data.subarray(8,40));
      const cbh=await info(pda([ENC.encode('card_battle_history'),mint.toBytes()]));
      const wins=cbh?cbh.data.readUInt32LE(40):0;
      if(wins>=10){found={mint:mint.toBase58(),wins,rarity:a.account.data[41]};break;}}
    if(found) console.log(`CARD=${found.mint} CBH_WINS=${found.wins} CMR_RARITY=${found.rarity}`);
    else console.log(`CARD=NONE`);
  }catch(e){ console.log(`GPA_ERR=${e.message||e}`); }
}catch(e){ console.log('SANITY_ERR='+(e.message||e)); }
NODE
)
EB=$(echo "$SANITY" | sed -n 's/^ENERGY_B=//p'); DC=$(echo "$SANITY" | sed -n 's/^DUEL_COUNT=//p')
CARD=$(echo "$SANITY" | sed -n 's/^CARD=//p'); GPAERR=$(echo "$SANITY" | sed -n 's/^GPA_ERR=//p')
CW=$(echo "$SANITY" | grep -oE "CBH_WINS=[0-9]+" | cut -d= -f2); CR=$(echo "$SANITY" | grep -oE "CMR_RARITY=[0-9]+" | cut -d= -f2)
SERR=$(echo "$SANITY" | sed -n 's/^SANITY_ERR=//p')
FIXTURES_OK=1
if [ -n "$SERR" ]; then bad "sanity read failed: $SERR (stderr /tmp/devnet-sanity.err)"; FIXTURES_OK=0; fi
[ "$EB" = "0" ] && ok "B(Hcmn…) energy = 0" || { bad "B energy = ${EB:-?} (expect 0 — fixture not created)"; FIXTURES_OK=0; }
if [ -n "$GPAERR" ]; then
  warn "getProgramAccounts blocked on public devnet RPC ($GPAERR) — DuelState count + card sanity need a dedicated RPC"
  FIXTURES_OK=0
else
  [ "$DC" = "15" ] && ok "DuelState count = 15" || { bad "DuelState count = ${DC:-?} (expect 15)"; FIXTURES_OK=0; }
  if [ "$CARD" = "NONE" ] || [ -z "$CARD" ]; then bad "fixture card (CBH wins 10) not found"; FIXTURES_OK=0;
  else
    [ "$CW" = "10" ] && ok "card ${CARD:0:6}… CBH wins = 10" || { bad "card wins = ${CW:-?} (expect 10)"; FIXTURES_OK=0; }
    [ "$CR" = "0" ]  && ok "card CMR rarity = 0 (Common)" || { bad "card rarity = ${CR:-?} (expect 0)"; FIXTURES_OK=0; }
  fi
fi
if [ "$FIXTURES_OK" != "1" ]; then
  TODO+=("CREATE devnet fixtures (world init → mint Common card, A wins 10 → B energy 0). Run the §10 fixture script against devnet (needs snarkjs installed for the ZK duels):|OXARK_PROGRAM_ID=$PROGRAM_ID node dev/f1-fixture-prep.mjs --rpc $RPC --admin ~/.config/solana/id.json --win-target 10")
fi

# ── 4. verdict / punch-list ──────────────────────────────────────────────────
echo    ""
echo    "════════════════════════════════════════════════════════════"
if [ ${#TODO[@]} -eq 0 ] && [ "$FIXTURES_OK" = "1" ]; then
  printf '  \033[1;32m● READY\033[0m — devnet fixtures live. Browser e2e:\n'
  echo  "    1. Phantom → switch network to Devnet, import B (secret in B.json)"
  echo  "    2. open the DEVNET client build (pristine main config: NETWORK=devnet, PROGRAM_ID=$PROGRAM_ID)"
  echo  "    3. verify: B energy HUD 0 · fixture card PROMOTE-ready (wins 10) · 15 DuelStates"
else
  printf '  \033[1;33m● NEEDS SETUP\033[0m — r0ze punch-list (needs r0ze keys):\n'
  n=1
  for item in "${TODO[@]}"; do
    printf '\n  %d. %s\n     $ %s\n' "$n" "${item%%|*}" "${item#*|}"
    n=$((n+1))
  done
  echo  ""
  echo  "  Devnet SOL is FREE — repeat airdrops as needed (rate-limited ~2 SOL/req)."
fi
echo    "════════════════════════════════════════════════════════════"
