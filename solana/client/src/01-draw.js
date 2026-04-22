// ═══════════════════════════════════════
// 0xARK DESIGN SYSTEM — "Dark Arcana" (v199)
// Gothic dark fantasy: void purple · amber gold · arcane rune · bioluminescent teal
// ═══════════════════════════════════════
const ARK={
  bg:       '#080810',  // void — deep purple-black
  panel:    '#0c0b1e',  // dark indigo hull
  panelMid: '#0e0c22',  // deep indigo interior
  panelLit: '#141228',  // lit arcane panel
  border:   '#201a48',  // muted purple border
  borderLit:'#2e2060',  // arcane highlight
  gold:     '#c8a448',  // amber brass
  goldDim:  '#7a6028',  // tarnished amber
  goldBright:'#e8c870', // polished amber
  teal:     '#2898a8',  // bioluminescent
  tealDim:  '#186070',
  tealBright:'#50c8d8',
  text:     '#d8d4c0',  // aged parchment
  textDim:  '#6878a0',  // weathered
  textBright:'#f0ecd8', // fresh parchment
  danger:   '#b83030',
  dangerBright:'#e04848',
  safe:     '#2a7a48',
  safeBright:'#48c070',
  water:    '#080f20',
  rune:     '#9945FF',  // arcane rune purple (NFT / blockchain)
  runeDim:  '#4a1a8a',  // dim rune
  runeBright:'#c060ff', // bright rune glow
  rarC:['#707880','#5090d0','#9050d8','#c09020','#e8c840'], // rarity tints C/U/R/E/L
};
// Keep FRLG object for legacy text color refs (mapped to ARK values)
const FRLG={
  textColor:ARK.text,
  selHighlight:ARK.gold,
  hpGreen:ARK.safeBright,
  hpYellow:'#d0a030',
  hpRed:ARK.dangerBright,
  borderOuter:ARK.borderLit,   // viewport outer border
  borderInner:ARK.border,      // viewport inner border
};

// ── Main panel window — dark gothic arcane style ──
function win(x,y,w,h,accent){
  const ac=accent||ARK.gold;
  // Outermost border (1px, purple-dark)
  g.fillStyle=ARK.border;g.fillRect(x,y,w,1);g.fillRect(x,y+h-1,w,1);g.fillRect(x,y,1,h);g.fillRect(x+w-1,y,1,h);
  // Outer fill
  g.fillStyle=ARK.panel;g.fillRect(x+1,y+1,w-2,h-2);
  // Subtle arcane inner tint
  g.globalAlpha=0.05;g.fillStyle=ARK.rune;g.fillRect(x+1,y+1,w-2,h-2);g.globalAlpha=1;
  // Inner inset border (arcane purple highlight)
  g.fillStyle=ARK.borderLit;g.fillRect(x+3,y+3,w-6,1);g.fillRect(x+3,y+h-4,w-6,1);g.fillRect(x+3,y+3,1,h-6);g.fillRect(x+w-4,y+3,1,h-6);
  // Inner content fill
  g.fillStyle=ARK.panelMid;g.fillRect(x+4,y+4,w-8,h-8);
  // Amber accent top line
  g.fillStyle=ARK.goldDim;g.fillRect(x+5,y+4,w-10,1);
  // Corner gothic rune cross ornaments
  g.fillStyle=ac;
  // TL cross
  g.fillRect(x+1,y+3,5,1);g.fillRect(x+3,y+1,1,5);
  // TR cross
  g.fillRect(x+w-6,y+3,5,1);g.fillRect(x+w-4,y+1,1,5);
  // BL cross
  g.fillRect(x+1,y+h-4,5,1);g.fillRect(x+3,y+h-6,1,5);
  // BR cross
  g.fillRect(x+w-6,y+h-4,5,1);g.fillRect(x+w-4,y+h-6,1,5);
  // Center dot of each cross (goldDim)
  g.fillStyle=ARK.goldDim;
  g.fillRect(x+3,y+3,1,1);g.fillRect(x+w-4,y+3,1,1);
  g.fillRect(x+3,y+h-4,1,1);g.fillRect(x+w-4,y+h-4,1,1);
  // Subtle scanline texture
  g.fillStyle='rgba(0,0,0,.06)';
  for(let sy=y+6;sy<y+h-6;sy+=2)g.fillRect(x+5,sy,w-10,1);
}

// ── Legendary card rune glow — draw pulsing arcane aura outside a rect ──
// v259: Hoisted glow step arrays — eliminates 4 tuple-array literals per drawRuneGlow call
const _GLOW_D=[2,4,6,9],_GLOW_C=['rgba(153,69,255,.5)','rgba(153,69,255,.25)','rgba(192,96,255,.12)','rgba(153,69,255,.05)'];
function drawRuneGlow(x,y,w,h,col,fr_){
  // v395: use cached _sFr06 (always called with global fr as fr_)
  const pulse=0.4+_sFr06*0.4;
  g.globalAlpha=pulse*0.6;
  // Outer blur layers (4 concentric outlines)
  for(let _gi=0;_gi<4;_gi++){const d=_GLOW_D[_gi];g.fillStyle=_GLOW_C[_gi];g.fillRect(x-d,y-d,w+d*2,h+d*2);g.fillRect(x-d+1,y-d+1,w+d*2-2,h+d*2-2);}
  // Bright inner rim
  g.globalAlpha=pulse*0.9;g.fillStyle=col||ARK.rune;
  g.fillRect(x-1,y,w+2,1);g.fillRect(x-1,y+h,w+2,1);
  g.fillRect(x-1,y,1,h+1);g.fillRect(x+w,y,1,h+1);
  g.globalAlpha=1;
}

function bx(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}
function tx(s,x,y,sz,c){
  setFont(Math.max(12,Math.round((sz||12)*1.4)));
  g.fillStyle=c||ARK.text;g.fillText(s,x,y);
}
// v246: Font cache — g.font= is one of the most expensive Canvas2D ops (triggers font metric recalc)
// v246: Font + shadow state cache — skips redundant Canvas2D property assigns
// v353: pre-baked font strings 12-60px — eliminates string concat on font-size changes
const _FONT_STR=(()=>{const m={};for(let i=12;i<=60;i++)m[i]=i+"px 'VT323',monospace";return m;})();
// _lastFontSz reset each draw() frame + after non-VT323 g.font= calls
let _lastFontSz=-1,_shadowReady=false;
function setFont(sz){if(sz!==_lastFontSz){g.font=_FONT_STR[sz]||(sz+"px 'VT323',monospace");_lastFontSz=sz;}}
function txShadow(s,x,y,sz,color,shadowColor){
  // v210: native shadow API — 3 fillText → 1 (save ~100 draw calls/frame)
  // v246: cache font + shadow offset state — static offset/blur set once per frame (saves 3×N assigns)
  setFont(Math.max(12,Math.round((sz||12)*1.4)));
  if(!_shadowReady){g.shadowOffsetX=1;g.shadowOffsetY=1;g.shadowBlur=0;_shadowReady=true;}
  g.shadowColor=shadowColor||'rgba(0,0,0,0.9)';
  g.fillStyle=color||ARK.text;g.fillText(s,x,y);
  g.shadowColor='transparent';
}

// ═══════════════════════════════════════
// PHANTOM WALLET INTEGRATION
// ═══════════════════════════════════════
const WALLET_PROGRAM_ID='5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN';
const WALLET_DEVNET_RPC='https://api.devnet.solana.com';
let walletConnected=false;
let walletPublicKey=null;
let walletLastCommitHash=null;
let programVerified=false; // true if on-chain program confirmed on devnet

async function connectPhantom(){
  if(!window.solana||!window.solana.isPhantom){
    walletPublicKey=null;walletConnected=false;
    return null;
  }
  try{
    const resp=await window.solana.connect();
    walletConnected=true;
    walletPublicKey=resp.publicKey.toString();
    lg.push('[WALLET] Connected: '+walletPublicKey.slice(0,8)+'..');
    // Verify program exists on devnet
    verifyProgram();
    return walletPublicKey;
  }catch(err){
    console.error('Wallet connection failed:',err);
    walletConnected=false;walletPublicKey=null;
    return null;
  }
}

async function disconnectPhantom(){
  if(window.solana){
    try{await window.solana.disconnect();}catch(e){}
  }
  walletConnected=false;walletPublicKey=null;programVerified=false;
}

async function verifyProgram(){
  try{
    const res=await fetch(WALLET_DEVNET_RPC,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getAccountInfo',params:[WALLET_PROGRAM_ID,{encoding:'base64'}]})});
    const data=await res.json();
    programVerified=!!(data.result&&data.result.value&&data.result.value.executable);
    if(programVerified)lg.push('[ON-CHAIN] Program verified on devnet!');
  }catch(e){programVerified=false;}
}

function generateSalt(){return crypto.getRandomValues(new Uint8Array(32));}

function base58Decode(str){
  const ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE=58;let result=[0];
  for(const char of str){
    let carry=ALPHABET.indexOf(char);
    if(carry===-1)throw new Error('Invalid base58 character');
    for(let j=0;j<result.length;j++){carry+=result[j]*BASE;result[j]=carry&0xff;carry>>=8;}
    while(carry>0){result.push(carry&0xff);carry>>=8;}
  }
  for(const char of str){if(char!=='1')break;result.push(0);}
  return new Uint8Array(result.reverse());
}

async function computeCommitHash(actionType,targetPubkey,salt){
  const data=new Uint8Array(1+32+32);
  data[0]=actionType;
  const target32=new Uint8Array(32);
  if(targetPubkey instanceof Uint8Array||ArrayBuffer.isView(targetPubkey)){
    // Already bytes — copy directly
    target32.set(targetPubkey.slice(0,32));
  }else if(targetPubkey){
    try{const decoded=base58Decode(targetPubkey);target32.set(decoded.slice(0,32));}catch(e){}
  }
  data.set(target32,1);
  data.set(salt,33);
  const hashBuffer=await crypto.subtle.digest('SHA-256',data);
  return new Uint8Array(hashBuffer);
}

function walletAddressTruncated(){
  if(!walletPublicKey)return'';
  return walletPublicKey.slice(0,4)+'..'+walletPublicKey.slice(-4);
}

function hexFromBytes(bytes){
  return'0x'+Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,12)+'..';
}

// ═══════════════════════════════════════
// ZK PROOF SYSTEM (snarkjs browser)
// ═══════════════════════════════════════
let zkProofReady=false;
let zkLastProof=null; // {proof, publicSignals}
let zkProofGenerating=false;
let zkProofStatus='idle'; // idle, generating, verified, failed

async function zkGenerateProof(actionType, targetArea, salt){
  if(typeof snarkjs==='undefined'){zkProofStatus='failed';return null;}
  zkProofGenerating=true;zkProofStatus='generating';
  try{
    // Salt as BN254 field element (31 bytes max to stay in field)
    const saltBig=BigInt('0x'+Array.from(salt.slice(0,31)).map(b=>b.toString(16).padStart(2,'0')).join(''));
    // Compute Poseidon hash first using poseidon-lite (circomlib-compatible BN254)
    let commitHash='0';
    try{
      const {poseidon3}=await import('https://esm.sh/poseidon-lite@0.2.1');
      commitHash=poseidon3([BigInt(actionType),BigInt(targetArea),saltBig]).toString();
    }catch(hashErr){
      // If CDN fails, we still attempt proof — will fail if hash is wrong
      lg.push('[ZK] Hash compute failed: '+String(hashErr.message||'').slice(0,30));
    }
    const input={
      actionType:String(actionType),
      targetArea:String(targetArea),
      salt:saltBig.toString(),
      commitHash:commitHash,
    };
    const{proof,publicSignals}=await snarkjs.groth16.fullProve(
      input,'commit_reveal.wasm','commit_reveal_final.zkey'
    );
    zkLastProof={proof,publicSignals};
    zkProofReady=true;zkProofGenerating=false;zkProofStatus='verified';
    lg.push('[ZK] Proof verified! Hash:'+publicSignals[0].slice(0,10)+'..');
    return{proof,publicSignals};
  }catch(e){
    zkProofStatus='failed';zkProofGenerating=false;
    lg.push('[ZK] '+(e.message||'proof failed').slice(0,40));
    return null;
  }
}

async function zkVerifyProof(){
  if(!zkLastProof)return false;
  try{
    const vkey=await fetch('verification_key.json').then(r=>r.json());
    const valid=await snarkjs.groth16.verify(vkey,zkLastProof.publicSignals,zkLastProof.proof);
    lg.push('[ZK] Proof verification: '+(valid?'VALID':'INVALID'));
    return valid;
  }catch(e){lg.push('[ZK] Verify error');return false;}
}

// Convert snarkjs decimal-string field element to 32-byte big-endian Uint8Array
function _fieldToBE32(decStr){
  let hex=BigInt(decStr).toString(16);
  if(hex.length>64)hex=hex.slice(-64);
  hex=hex.padStart(64,'0');
  const out=new Uint8Array(32);
  for(let i=0;i<32;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);
  return out;
}

// Serialize snarkjs Groth16 proof to on-chain byte arrays:
//   proof_a  → [u8;64]  : x(32BE) || y(32BE)
//   proof_b  → [u8;128] : x1(32) || x0(32) || y1(32) || y0(32)  (G2 coords swapped)
//   proof_c  → [u8;64]  : x(32BE) || y(32BE)
//   pub_inp  → [u8;32]  : public signal[0] as 32-byte BE
function zkSerializeProof(proof,publicSignals){
  const a=new Uint8Array(64);
  a.set(_fieldToBE32(proof.pi_a[0]),0);
  a.set(_fieldToBE32(proof.pi_a[1]),32);

  const b=new Uint8Array(128);
  // BN254 G2 uses (x1,x0) / (y1,y0) — snarkjs stores [x0,x1] and [y0,y1]
  b.set(_fieldToBE32(proof.pi_b[0][1]),0);   // x1
  b.set(_fieldToBE32(proof.pi_b[0][0]),32);  // x0
  b.set(_fieldToBE32(proof.pi_b[1][1]),64);  // y1
  b.set(_fieldToBE32(proof.pi_b[1][0]),96);  // y0

  const c=new Uint8Array(64);
  c.set(_fieldToBE32(proof.pi_c[0]),0);
  c.set(_fieldToBE32(proof.pi_c[1]),32);

  const pub=_fieldToBE32(publicSignals[0]);

  return{proof_a:a,proof_b:b,proof_c:c,public_inputs:pub};
}

// ─── Instruction: verify_zk_proof ────────────────────────────────────────────
// disc: sha256("global:verify_zk_proof")[0..8]
// onchainVerifyZk removed — replaced by _onchainVerifyZk (uses window.oxarkOnchain.verifyZkProof with correct account order)

// ═══════════════════════════════════════
// ON-CHAIN TRANSACTION INTEGRATION
// ═══════════════════════════════════════
let onchainLastTxSig='';
let onchainCommitPhase=false;
let onchainRevealPhase=false;
let onchainPendingSalt=null;
let _zkVerifyFiredThisRound=false; // guard: fire verify_zk_proof once per round

// Convert snarkjs proof object to on-chain byte buffers and call verifyZkProof.
// Fire-and-forget; failures are logged to the on-chain overlay only.
async function _onchainVerifyZk(gameId,snarkProof){
  try{
    function _f32(s){const bi=BigInt(s);const b=new Uint8Array(32);for(let i=0;i<32;i++)b[31-i]=Number((bi>>BigInt(i*8))&0xffn);return b;}
    const pA=new Uint8Array(64);pA.set(_f32(snarkProof.proof.pi_a[0]),0);pA.set(_f32(snarkProof.proof.pi_a[1]),32);
    const pB=new Uint8Array(128);pB.set(_f32(snarkProof.proof.pi_b[0][1]),0);pB.set(_f32(snarkProof.proof.pi_b[0][0]),32);pB.set(_f32(snarkProof.proof.pi_b[1][1]),64);pB.set(_f32(snarkProof.proof.pi_b[1][0]),96);
    const pC=new Uint8Array(64);pC.set(_f32(snarkProof.proof.pi_c[0]),0);pC.set(_f32(snarkProof.proof.pi_c[1]),32);
    const pI=_f32(snarkProof.publicSignals[0]);
    const sig=await window.oxarkOnchain.verifyZkProof(gameId,pA,pB,pC,pI);
    logOnchain('[ZK] On-chain verify \u2713 TX:'+sig.slice(0,8)+'..');
    zkProofStatus='verified';
  }catch(e){
    logOnchain('[ZK] verify: '+(e.message||'failed').slice(0,30));
  }
}

// ── STAKE SYSTEM UI STATE ──
let stakeConfirmActive=false; // show deposit confirmation before game start
const STAKE_AMOUNT=0.01; // SOL per player
const PLAYER_COUNT=3; // total players in match
let stakePotAmount=STAKE_AMOUNT*PLAYER_COUNT;
let stakeDeposited=false; // whether player has deposited stake on-chain

// ── ON-CHAIN SESSION GAME ID ──
// Persistent across page reload; used for all on-chain calls this session.
// Generated once per NEW GAME; retrieved on CONTINUE.
function getOnchainGameId(){
  let id=localStorage.getItem('oxark_session_game_id');
  if(!id){id=String(Date.now());localStorage.setItem('oxark_session_game_id',id);}
  return Number(id);
}
function resetOnchainGameId(){
  const id=String(Date.now());
  localStorage.setItem('oxark_session_game_id',id);
  return Number(id);
}
let _sessionGameId=getOnchainGameId();

// Wire real on-chain game creation + deposit when wallet is connected.
// Called when user confirms NEW GAME with wallet.
async function onchainStartSession(){
  if(!walletConnected||!window.oxarkOnchain)return;
  const playerPk=window.solana.publicKey.toBase58();
  try{
    const gameId=_sessionGameId;
    lg.push('[ON-CHAIN] Creating game '+gameId+' on devnet…');
    await window.oxarkOnchain.createGame(gameId,2);
    lg.push('[ON-CHAIN] Game created. Joining…');
    await window.oxarkOnchain.joinGame(gameId);
    // Start game immediately (solo: host = player; distributes starter cards via remaining_accounts)
    lg.push('[ON-CHAIN] Starting game (CommitPhase)…');
    await window.oxarkOnchain.startGame(gameId,[playerPk]);
    lg.push('[ON-CHAIN] Game started. Depositing stake…');
    const sig=await window.oxarkOnchain.depositStake(gameId);
    stakeDeposited=true;
    lg.push('[ON-CHAIN] Stake deposited! TX: '+sig.slice(0,12)+'..');
  }catch(e){
    // Fallback: game may already exist (CONTINUE), or devnet rate-limited.
    // Try just deposit if game exists and we haven't deposited yet.
    try{
      if(!stakeDeposited){
        const sig=await window.oxarkOnchain.depositStake(_sessionGameId);
        stakeDeposited=true;
        lg.push('[ON-CHAIN] Stake deposited (existing game). TX: '+sig.slice(0,12)+'..');
      }
    }catch(_){
      lg.push('[ON-CHAIN] On-chain start failed: '+(e.message||'').slice(0,50));
      stakeDeposited=true; // allow game to proceed even if on-chain fails
    }
  }
}





// Helper: draw Solana diamond logo (tilted square in purple/green gradient)
function drawSolanaLogo(cx,cy,size){
  g.save();
  g.translate(cx,cy);
  g.rotate(Math.PI/4);
  // Outer diamond (gradient purple->green)
  const half=size/2;
  bx(-half,-half,size,size/3,'#9945FF');
  bx(-half,-half+size/3,size,size/3,'#14F195');
  bx(-half,-half+size*2/3,size,size/3,'#9945FF');
  g.restore();
}

// Helper: draw small Solana icon (tiny for HUD)
function drawSolanaIcon(x,y,sz){
  g.save();
  g.translate(x+sz/2,y+sz/2);
  g.rotate(Math.PI/4);
  const h=sz/2;
  bx(-h,-h,sz,Math.ceil(sz/3),'#9945FF');
  bx(-h,-h+Math.ceil(sz/3),sz,Math.ceil(sz/3),'#14F195');
  bx(-h,-h+Math.ceil(sz*2/3),sz,Math.floor(sz/3),'#9945FF');
  g.restore();
}

// Generate a truncated fake tx signature for display
function generateFakeTxSig(){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16);
}

// Solana connection for real transactions
const solConnection=typeof solanaWeb3!=='undefined'?new solanaWeb3.Connection(WALLET_DEVNET_RPC,'confirmed'):null;
const PROGRAM_PUBKEY=typeof solanaWeb3!=='undefined'?new solanaWeb3.PublicKey(WALLET_PROGRAM_ID):null;

// Build Anchor instruction data (8-byte discriminator + args)
function anchorInstructionData(discriminator, argsBuffer){
  const disc=new Uint8Array(discriminator);
  if(!argsBuffer)return disc;
  const data=new Uint8Array(disc.length+argsBuffer.length);
  data.set(disc);data.set(argsBuffer,disc.length);
  return data;
}

// NPC deterministic pubkeys (stable placeholders for rival targets)
const NPC_PUBKEYS={
  VEGA:'VEGAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  MIRA:'MIRAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
};
// Map rival index to 32-byte target for hashing
function rivalTargetBytes(rivalIdx){
  if(!solanaWeb3)return new Uint8Array(32);
  try{
    // VEGA=index1, MIRA=index2 — use SystemProgram as fallback npc key base
    const seed=rivalIdx===1?'oxark_npc_vega_v1':'oxark_npc_mira_v1';
    const enc=new TextEncoder().encode(seed);
    const padded=new Uint8Array(32);padded.set(enc.slice(0,32));
    return padded;
  }catch(e){return new Uint8Array(32);}
}

// Commit action on-chain (real devnet TX when wallet connected)
async function onchainCommit(gameId,actionType,rivalIdx){
  if(!walletConnected)return null;
  const salt=generateSalt();
  const saltHex=Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('');
  const targetBytes=rivalTargetBytes(rivalIdx);
  const targetHex=Array.from(targetBytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  onchainPendingSalt=salt;

  try{
    const hash=await computeCommitHash(actionType,targetBytes,salt);
    const hashHex=hexFromBytes(hash);

    if(solConnection&&window.solana){
      try{
        // Read current round from game account for PDA seed
        const gameIdBuf=new ArrayBuffer(8);new DataView(gameIdBuf).setBigUint64(0,BigInt(gameId),true);
        const gameIdBytes=new Uint8Array(gameIdBuf);
        const playerKey=new solanaWeb3.PublicKey(walletPublicKey);
        const [gamePda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('game'),gameIdBytes],PROGRAM_PUBKEY
        );
        // Read round from game account
        let round=0;
        try{
          const gameAcct=await solConnection.getAccountInfo(gamePda);
          if(gameAcct){round=gameAcct.data[49];}// round: u8 at offset 49 in Game struct
        }catch(_){}
        const roundBytes=new Uint8Array([round&0xff]);// u8 — 1 byte, matches Rust to_le_bytes()

        // Store round+target for reveal
        localStorage.setItem('oxark_onchain_salt',saltHex);
        localStorage.setItem('oxark_onchain_action',String(actionType));
        localStorage.setItem('oxark_onchain_target_hex',targetHex);
        localStorage.setItem('oxark_onchain_round',String(round));
        localStorage.setItem('oxark_onchain_gameid',String(gameId));

        // commit_action discriminator: [75,26,232,17,11,158,202,221]
        const args=new Uint8Array(8+32);// game_id(u64) + hash([u8;32])
        args.set(gameIdBytes,0);args.set(hash,8);
        const data=anchorInstructionData([75,26,232,17,11,158,202,221],args);

        const [playerPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('player'),gameIdBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        // Commit PDA includes round: [COMMIT_SEED, game_id, round, player]
        const [commitPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('commit'),gameIdBytes,roundBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        const ix=new solanaWeb3.TransactionInstruction({
          keys:[
            {pubkey:gamePda,isSigner:false,isWritable:true},
            {pubkey:playerPda,isSigner:false,isWritable:true},
            {pubkey:commitPda,isSigner:false,isWritable:true},
            {pubkey:playerKey,isSigner:true,isWritable:true},
            {pubkey:solanaWeb3.SystemProgram.programId,isSigner:false,isWritable:false},
          ],
          programId:PROGRAM_PUBKEY,data:data,
        });
        const tx=new solanaWeb3.Transaction().add(ix);
        tx.feePayer=playerKey;
        tx.recentBlockhash=(await solConnection.getLatestBlockhash()).blockhash;
        const signed=await window.solana.signTransaction(tx);
        const txSig=await solConnection.sendRawTransaction(signed.serialize());
        onchainLastTxSig=txSig;
        lg.push('[ON-CHAIN] Commit TX: '+txSig.slice(0,12)+'..');
        return{hash:hashHex,salt:saltHex,txSig};
      }catch(txErr){
        lg.push('[ON-CHAIN] Commit TX failed, sim: '+(txErr.message||'').slice(0,28));
      }
    }
    // Store for reveal even in simulated path
    localStorage.setItem('oxark_onchain_salt',saltHex);
    localStorage.setItem('oxark_onchain_action',String(actionType));
    localStorage.setItem('oxark_onchain_target_hex',targetHex);
    localStorage.setItem('oxark_onchain_round','0');
    localStorage.setItem('oxark_onchain_gameid',String(gameId));
    const txSig=generateFakeTxSig();
    onchainLastTxSig=txSig;
    return{hash:hashHex,salt:saltHex,txSig};
  }catch(e){return null;}
}

// Reveal action on-chain (real devnet TX when wallet connected)
async function onchainReveal(gameId,actionType,rivalIdx,salt){
  if(!walletConnected)return null;
  try{
    const saltHex2=Array.from(salt).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,16)+'..';

    if(solConnection&&window.solana){
      try{
        const gameIdBuf=new ArrayBuffer(8);new DataView(gameIdBuf).setBigUint64(0,BigInt(gameId),true);
        const gameIdBytes=new Uint8Array(gameIdBuf);
        const playerKey=new solanaWeb3.PublicKey(walletPublicKey);

        // Load round stored at commit time (round is u8, so 1 byte in PDA seed)
        const round=parseInt(localStorage.getItem('oxark_onchain_round')||'0',10);
        const roundBytes=new Uint8Array([round&0xff]);// u8 — 1 byte, matches Rust to_le_bytes()

        // Restore target bytes from hex stored at commit time
        const targetHex=localStorage.getItem('oxark_onchain_target_hex')||'';
        const targetBytes=new Uint8Array(32);
        for(let i=0;i<32&&i*2<targetHex.length;i++){
          targetBytes[i]=parseInt(targetHex.slice(i*2,i*2+2),16);
        }

        const [gamePda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('game'),gameIdBytes],PROGRAM_PUBKEY
        );
        const [playerPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('player'),gameIdBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        const [commitPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [new TextEncoder().encode('commit'),gameIdBytes,roundBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );

        // reveal_action discriminator: [251,43,123,150,183,44,178,210]
        // args: game_id(u64) + action_type(u8) + target(32 bytes) + salt(32 bytes) = 73 bytes
        const args=new Uint8Array(8+1+32+32);
        args.set(gameIdBytes,0);
        args[8]=actionType&0xff;
        args.set(targetBytes,9);
        args.set(salt,41);
        const data=anchorInstructionData([251,43,123,150,183,44,178,210],args);

        const ix=new solanaWeb3.TransactionInstruction({
          keys:[
            {pubkey:gamePda,isSigner:false,isWritable:true},
            {pubkey:playerPda,isSigner:false,isWritable:true},
            {pubkey:commitPda,isSigner:false,isWritable:false},
            {pubkey:playerKey,isSigner:true,isWritable:false},
          ],
          programId:PROGRAM_PUBKEY,data:data,
        });
        const tx=new solanaWeb3.Transaction().add(ix);
        tx.feePayer=playerKey;
        tx.recentBlockhash=(await solConnection.getLatestBlockhash()).blockhash;
        const signed=await window.solana.signTransaction(tx);
        const txSig=await solConnection.sendRawTransaction(signed.serialize());
        onchainLastTxSig=txSig;
        lg.push('[ON-CHAIN] Reveal TX: '+txSig.slice(0,12)+'..');
        localStorage.removeItem('oxark_onchain_salt');
        localStorage.removeItem('oxark_onchain_action');
        localStorage.removeItem('oxark_onchain_target_hex');
        localStorage.removeItem('oxark_onchain_round');
        localStorage.removeItem('oxark_onchain_gameid');
        // Submit ZK proof on-chain after successful reveal (background)
        if(zkLastProof&&window.oxarkOnchain&&!_zkVerifyFiredThisRound){
          _zkVerifyFiredThisRound=true;
          _onchainVerifyZk(gameId,zkLastProof);
        }
        return{txSig};
      }catch(txErr){
        lg.push('[ON-CHAIN] Reveal TX failed, sim: '+(txErr.message||'').slice(0,28));
      }
    }
    // Simulated fallback
    const txSig=generateFakeTxSig();
    onchainLastTxSig=txSig;
    lg.push('[ON-CHAIN] Reveal TX (sim): action='+actionType+' salt='+saltHex2);
    localStorage.removeItem('oxark_onchain_salt');
    localStorage.removeItem('oxark_onchain_action');
    localStorage.removeItem('oxark_onchain_target_hex');
    localStorage.removeItem('oxark_onchain_round');
    localStorage.removeItem('oxark_onchain_gameid');
    return{txSig};
  }catch(e){return null;}
}

// Helper to add on-chain prefixed log entry
function logOnchain(msg){
  if(walletConnected){
    lg.push('[ON-CHAIN] '+msg);
  }else{
    lg.push(msg);
  }
}

// ── On-chain instruction helpers ──────────────────────────────────────────
// Discriminators: sha256("global:<name>")[0..8]
const DISC={
  create_game:    [124,69,75,66,184,220,72,206],
  join_game:      [107,112,18,38,56,173,60,128],
  start_game:     [249,47,252,172,184,162,245,14],
  resolve_round:  [165,114,237,158,1,36,70,254],
  deposit_stake:  [160,167,9,220,74,243,228,43],
  claim_prize:    [157,233,139,121,246,62,234,235],
};

function gameIdBuf(id){
  const b=new ArrayBuffer(8);new DataView(b).setBigUint64(0,BigInt(id),true);
  return new Uint8Array(b);
}

function _gamePDA(gameId){
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('game'),gameIdBuf(gameId)],PROGRAM_PUBKEY)[0];
}
function _playerPDA(gameId,pk){
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('player'),gameIdBuf(gameId),pk.toBytes()],PROGRAM_PUBKEY)[0];
}
function _cardPoolPDA(gameId){
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('card_pool'),gameIdBuf(gameId)],PROGRAM_PUBKEY)[0];
}
function _stakeVaultPDA(gameId){
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('stake_vault'),gameIdBuf(gameId)],PROGRAM_PUBKEY)[0];
}

async function _sendIx(keys,data){
  if(!solConnection||!window.solana)throw new Error('No wallet/connection');
  const ix=new solanaWeb3.TransactionInstruction({keys,programId:PROGRAM_PUBKEY,data});
  const tx=new solanaWeb3.Transaction().add(ix);
  tx.feePayer=window.solana.publicKey;
  tx.recentBlockhash=(await solConnection.getLatestBlockhash()).blockhash;
  const signed=await window.solana.signTransaction(tx);
  const sig=await solConnection.sendRawTransaction(signed.serialize());
  await solConnection.confirmTransaction(sig,'confirmed');
  return sig;
}

async function onchainCreateGame(gameId,maxPlayers){
  if(!walletConnected)return null;
  try{
    const payer=window.solana.publicKey;
    const gid=gameIdBuf(gameId);
    const gamePDA=_gamePDA(gameId);
    const poolPDA=_cardPoolPDA(gameId);
    // disc(8)+game_id(8)+max_players(1)=17
    const data=new Uint8Array(17);
    data.set(DISC.create_game,0);data.set(gid,8);data[16]=maxPlayers&0xff;
    const sig=await _sendIx([
      {pubkey:payer,isSigner:true,isWritable:true},
      {pubkey:gamePDA,isSigner:false,isWritable:true},
      {pubkey:poolPDA,isSigner:false,isWritable:true},
      {pubkey:solanaWeb3.SystemProgram.programId,isSigner:false,isWritable:false},
    ],data);
    lg.push('[ON-CHAIN] CreateGame TX: '+sig.slice(0,12)+'..');
    return sig;
  }catch(e){lg.push('[ON-CHAIN] CreateGame failed: '+(e.message||'').slice(0,40));return null;}
}

async function onchainJoinGame(gameId){
  if(!walletConnected)return null;
  try{
    const payer=window.solana.publicKey;
    const gid=gameIdBuf(gameId);
    const gamePDA=_gamePDA(gameId);
    const playerPDA=_playerPDA(gameId,payer);
    // disc(8)+game_id(8)=16
    const data=new Uint8Array(16);
    data.set(DISC.join_game,0);data.set(gid,8);
    const sig=await _sendIx([
      {pubkey:payer,isSigner:true,isWritable:true},
      {pubkey:gamePDA,isSigner:false,isWritable:true},
      {pubkey:playerPDA,isSigner:false,isWritable:true},
      {pubkey:solanaWeb3.SystemProgram.programId,isSigner:false,isWritable:false},
    ],data);
    lg.push('[ON-CHAIN] JoinGame TX: '+sig.slice(0,12)+'..');
    return sig;
  }catch(e){lg.push('[ON-CHAIN] JoinGame failed: '+(e.message||'').slice(0,40));return null;}
}

async function onchainStartGame(gameId){
  if(!walletConnected)return null;
  try{
    const payer=window.solana.publicKey;
    const gid=gameIdBuf(gameId);
    const gamePDA=_gamePDA(gameId);
    const data=new Uint8Array(16);
    data.set(DISC.start_game,0);data.set(gid,8);
    const sig=await _sendIx([
      {pubkey:payer,isSigner:true,isWritable:true},
      {pubkey:gamePDA,isSigner:false,isWritable:true},
    ],data);
    lg.push('[ON-CHAIN] StartGame TX: '+sig.slice(0,12)+'..');
    return sig;
  }catch(e){lg.push('[ON-CHAIN] StartGame failed: '+(e.message||'').slice(0,40));return null;}
}

async function onchainResolveRound(gameId){
  if(!walletConnected)return null;
  try{
    const payer=window.solana.publicKey;
    const gid=gameIdBuf(gameId);
    const gamePDA=_gamePDA(gameId);
    const poolPDA=_cardPoolPDA(gameId);
    const data=new Uint8Array(16);
    data.set(DISC.resolve_round,0);data.set(gid,8);
    const sig=await _sendIx([
      {pubkey:payer,isSigner:true,isWritable:true},
      {pubkey:gamePDA,isSigner:false,isWritable:true},
      {pubkey:poolPDA,isSigner:false,isWritable:true},
    ],data);
    lg.push('[ON-CHAIN] ResolveRound TX: '+sig.slice(0,12)+'..');
    return sig;
  }catch(e){lg.push('[ON-CHAIN] ResolveRound failed: '+(e.message||'').slice(0,40));return null;}
}

async function onchainDepositStake(gameId){
  if(!walletConnected)return null;
  try{
    const payer=window.solana.publicKey;
    const gid=gameIdBuf(gameId);
    const gamePDA=_gamePDA(gameId);
    const vaultPDA=_stakeVaultPDA(gameId);
    const data=new Uint8Array(16);
    data.set(DISC.deposit_stake,0);data.set(gid,8);
    const sig=await _sendIx([
      {pubkey:payer,isSigner:true,isWritable:true},
      {pubkey:gamePDA,isSigner:false,isWritable:false},
      {pubkey:vaultPDA,isSigner:false,isWritable:true},
      {pubkey:solanaWeb3.SystemProgram.programId,isSigner:false,isWritable:false},
    ],data);
    lg.push('[ON-CHAIN] DepositStake TX: '+sig.slice(0,12)+'..');
    return sig;
  }catch(e){lg.push('[ON-CHAIN] DepositStake failed: '+(e.message||'').slice(0,40));return null;}
}

// ─── Instruction: mint_card_nft ──────────────────────────────────────────
// disc: sha256("global:mint_card_nft")[0..8]
const DISC_MINT_NFT=[234,240,66,205,104,91,164,223];
const CARD_MINT_SEED_STR='card_mint';
// SPL_TOKEN_PROGRAM_ID / SYSVAR_RENT_PUBKEY declared in onchain.js (same bundle scope)
const SPL_ATA_PROGRAM_ID='ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bq8';

function _cardMintPDA(gameId,cardId){
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [new TextEncoder().encode(CARD_MINT_SEED_STR),gameIdBuf(gameId),new Uint8Array([cardId&0xff])],
    PROGRAM_PUBKEY)[0];
}

function _findATA(ownerPubkey,mintPubkey){
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [ownerPubkey.toBytes(),new solanaWeb3.PublicKey(SPL_TOKEN_PROGRAM_ID).toBytes(),mintPubkey.toBytes()],
    new solanaWeb3.PublicKey(SPL_ATA_PROGRAM_ID))[0];
}

async function onchainMintCard(gameId,cardId){
  if(!walletConnected)return null;
  try{
    const payer=window.solana.publicKey;
    const gid=gameIdBuf(gameId);
    const gamePDA=_gamePDA(gameId);
    const playerPDA=_playerPDA(gameId,payer);
    const cardMint=_cardMintPDA(gameId,cardId);
    const playerATA=_findATA(payer,cardMint);
    const splToken=new solanaWeb3.PublicKey(SPL_TOKEN_PROGRAM_ID);
    const splATA=new solanaWeb3.PublicKey(SPL_ATA_PROGRAM_ID);
    const rent=new solanaWeb3.PublicKey(SYSVAR_RENT_PUBKEY);
    // disc(8) + game_id(8) + card_id(1) = 17 bytes
    const data=new Uint8Array(17);
    data.set(DISC_MINT_NFT,0);data.set(gid,8);data[16]=cardId&0xff;
    const sig=await _sendIx([
      {pubkey:gamePDA,   isSigner:false,isWritable:false},
      {pubkey:playerPDA, isSigner:false,isWritable:false},
      {pubkey:cardMint,  isSigner:false,isWritable:true},
      {pubkey:playerATA, isSigner:false,isWritable:true},
      {pubkey:payer,     isSigner:true, isWritable:true},
      {pubkey:splToken,  isSigner:false,isWritable:false},
      {pubkey:splATA,    isSigner:false,isWritable:false},
      {pubkey:solanaWeb3.SystemProgram.programId,isSigner:false,isWritable:false},
      {pubkey:rent,      isSigner:false,isWritable:false},
    ],data);
    lg.push('[NFT] Card '+cardId+' minted: '+sig.slice(0,12)+'..');
    return sig;
  }catch(e){
    lg.push('[NFT] Mint card '+cardId+' failed: '+(e.message||'').slice(0,40));
    return null;
  }
}

async function onchainClaimPrize(gameId){
  if(!walletConnected)return null;
  try{
    const payer=window.solana.publicKey;
    const gid=gameIdBuf(gameId);
    const gamePDA=_gamePDA(gameId);
    const playerPDA=_playerPDA(gameId,payer);
    const vaultPDA=_stakeVaultPDA(gameId);
    const data=new Uint8Array(16);
    data.set(DISC.claim_prize,0);data.set(gid,8);
    const sig=await _sendIx([
      {pubkey:payer,isSigner:true,isWritable:true},
      {pubkey:gamePDA,isSigner:false,isWritable:false},
      {pubkey:playerPDA,isSigner:false,isWritable:false},
      {pubkey:vaultPDA,isSigner:false,isWritable:true},
      {pubkey:solanaWeb3.SystemProgram.programId,isSigner:false,isWritable:false},
    ],data);
    lg.push('[ON-CHAIN] ClaimPrize TX: '+sig.slice(0,12)+'..');
    return sig;
  }catch(e){lg.push('[ON-CHAIN] ClaimPrize failed: '+(e.message||'').slice(0,40));return null;}
}

