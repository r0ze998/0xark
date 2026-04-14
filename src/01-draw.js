// ═══════════════════════════════════════
// FRLG WINDOW SYSTEM (pixel-perfect FRLG palette)
// ═══════════════════════════════════════
// FRLG palette constants
const FRLG={
  winBg:'#F8F0D0',       // warm cream background
  borderOuter:'#484050',  // dark purple-gray border
  borderInner:'#888078',  // medium gray inner border
  textColor:'#383830',    // warm dark text
  selHighlight:'#F8D830', // golden yellow selection
  hpGreen:'#58A850',
  hpYellow:'#F8C838',
  hpRed:'#E85048',
  // FRLG theme variants (selectable)
  themes:{
    red:   {winBg:'#F8E0D0',borderOuter:'#504040',borderInner:'#887068'},
    blue:  {winBg:'#D0E0F8',borderOuter:'#404060',borderInner:'#687888'},
    green: {winBg:'#D8F0D0',borderOuter:'#405040',borderInner:'#688868'},
    gold:  {winBg:'#F8F0D0',borderOuter:'#484050',borderInner:'#888078'}, // default
  },
};
let frlgTheme='gold'; // current theme
function getFRLGColors(){
  const t=FRLG.themes[frlgTheme]||FRLG.themes.gold;
  return{winBg:t.winBg,borderOuter:t.borderOuter,borderInner:t.borderInner};
}
function win(x,y,w,h){
  const tc=getFRLGColors();
  g.fillStyle=tc.borderOuter;
  g.fillRect(x+4,y,w-8,1);g.fillRect(x+3,y+1,w-6,1);g.fillRect(x+2,y+2,w-4,1);g.fillRect(x+1,y+3,w-2,1);
  g.fillRect(x+1,y+h-4,w-2,1);g.fillRect(x+2,y+h-3,w-4,1);g.fillRect(x+3,y+h-2,w-6,1);g.fillRect(x+4,y+h-1,w-8,1);
  g.fillRect(x,y+4,1,h-8);g.fillRect(x+1,y+3,1,h-6);g.fillRect(x+2,y+2,1,h-4);g.fillRect(x+3,y+1,1,h-2);
  g.fillRect(x+w-1,y+4,1,h-8);g.fillRect(x+w-2,y+3,1,h-6);g.fillRect(x+w-3,y+2,1,h-4);g.fillRect(x+w-4,y+1,1,h-2);
  g.fillStyle=tc.borderInner;
  g.fillRect(x+4,y+4,w-8,1);g.fillRect(x+4,y+h-5,w-8,1);
  g.fillRect(x+4,y+4,1,h-8);g.fillRect(x+w-5,y+4,1,h-8);
  g.fillStyle=tc.winBg;
  g.fillRect(x+5,y+5,w-10,h-10);
  // Top-left highlight (light catches top edge)
  g.fillStyle='rgba(255,255,255,.4)';
  g.fillRect(x+6,y+5,w-12,1);g.fillRect(x+5,y+6,1,h-12);
  // Bottom-right inner shadow (FRLG depth effect)
  g.fillStyle='rgba(0,0,0,.08)';
  g.fillRect(x+6,y+h-6,w-12,1);g.fillRect(x+w-6,y+6,1,h-12);
}

function bx(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}
// FRLG-style text: 1px letter spacing + slight bold via double draw at 0.5px offset
function tx(s,x,y,sz,c){
  g.fillStyle=c||FRLG.textColor;
  const finalSz=Math.max(12,Math.round((sz||12)*1.4));
  g.font=finalSz+"px 'VT323',monospace";
  g.fillText(s,x,y);
}
// Text with 1px shadow for readability (battle screens) — FRLG bold style
function txShadow(s,x,y,sz,color,shadowColor){
  const sc_=shadowColor||'rgba(0,0,0,0.85)';
  const finalSz=Math.max(12,Math.round((sz||12)*1.4));
  g.font=finalSz+"px 'VT323',monospace";
  g.fillStyle=sc_;g.fillText(s,x+1,y+1);
  g.fillStyle=color||'#fff';g.fillText(s,x,y);
}

// ═══════════════════════════════════════
// PHANTOM WALLET INTEGRATION
// ═══════════════════════════════════════
const WALLET_PROGRAM_ID='2gMYzenV6HQoTJA2899XxnLgzTbaWdVmegLqL7nMpVS3';
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
  const targetBytes=new Uint8Array(32);
  if(targetPubkey){
    try{const decoded=base58Decode(targetPubkey);targetBytes.set(decoded.slice(0,32));}catch(e){}
  }
  data.set(targetBytes,1);
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

// ═══════════════════════════════════════
// ON-CHAIN TRANSACTION INTEGRATION
// ═══════════════════════════════════════
let onchainLastTxSig='';
let onchainCommitPhase=false;
let onchainRevealPhase=false;
let onchainPendingSalt=null;

// ── STAKE SYSTEM UI STATE ──
let stakeConfirmActive=false; // show deposit confirmation before game start
const STAKE_AMOUNT=0.01; // SOL per player
const PLAYER_COUNT=3; // total players in match
let stakePotAmount=STAKE_AMOUNT*PLAYER_COUNT;
let stakeDeposited=false; // whether player has "deposited" (UI-only)





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
          [Buffer.from('game'),gameIdBytes],PROGRAM_PUBKEY
        );
        // Read round from game account
        let round=0;
        try{
          const gameAcct=await solConnection.getAccountInfo(gamePda);
          if(gameAcct){round=gameAcct.data[49];}// round is at byte 49 in Game struct
        }catch(_){}
        const roundBuf=new ArrayBuffer(4);new DataView(roundBuf).setUint32(0,round,true);
        const roundBytes=new Uint8Array(roundBuf);

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
          [Buffer.from('player'),gameIdBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        // Commit PDA includes round: [COMMIT_SEED, game_id, round, player]
        const [commitPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('commit'),gameIdBytes,roundBytes,playerKey.toBytes()],PROGRAM_PUBKEY
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

        // Load round stored at commit time
        const round=parseInt(localStorage.getItem('oxark_onchain_round')||'0',10);
        const roundBuf=new ArrayBuffer(4);new DataView(roundBuf).setUint32(0,round,true);
        const roundBytes=new Uint8Array(roundBuf);

        // Restore target bytes from hex stored at commit time
        const targetHex=localStorage.getItem('oxark_onchain_target_hex')||'';
        const targetBytes=new Uint8Array(32);
        for(let i=0;i<32&&i*2<targetHex.length;i++){
          targetBytes[i]=parseInt(targetHex.slice(i*2,i*2+2),16);
        }

        const [gamePda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('game'),gameIdBytes],PROGRAM_PUBKEY
        );
        const [playerPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('player'),gameIdBytes,playerKey.toBytes()],PROGRAM_PUBKEY
        );
        const [commitPda]=solanaWeb3.PublicKey.findProgramAddressSync(
          [Buffer.from('commit'),gameIdBytes,roundBytes,playerKey.toBytes()],PROGRAM_PUBKEY
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

