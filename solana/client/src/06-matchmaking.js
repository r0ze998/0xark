// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 06-matchmaking.js
// Matchmaking queue client — enter_queue / leave_queue + 2s PDA polling.
// Wired to the Duel Hall dialog buttons in 05-lobby.js.
// ═══════════════════════════════════════════════════════════════════════════

// ── Constants ────────────────────────────────────────────────────────────
const MM_PROGRAM_ID   = new solanaWeb3.PublicKey('5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN');
const MM_ENC          = new TextEncoder();
const MM_SEED_QUEUE   = MM_ENC.encode('queue');
const MM_DEVNET_RPC   = 'https://api.devnet.solana.com';
const MM_POLL_INTERVAL = 2000; // ms
const MM_TIMEOUT_MS   = 90_000; // 90s max in queue

// Error codes (Anchor error base = 6000; order matches error.rs declaration order)
const MM_ERRORS = {
  6033: 'Tier locked — insufficient wins at prerequisite tier',
  6034: 'Already in a matchmaking queue',
  6035: 'Not in this queue',
  6036: 'Queue is full (max 64 players)',
};

// ── Discriminator helper (SHA-256 of "global:<name>", first 8 bytes) ─────
const _mmDiscCache = {};
async function mmDisc(name) {
  if (_mmDiscCache[name]) return _mmDiscCache[name];
  const h = await crypto.subtle.digest('SHA-256', MM_ENC.encode(`global:${name}`));
  const d = new Uint8Array(h).slice(0, 8);
  _mmDiscCache[name] = d;
  return d;
}

// ── PDA derivation ────────────────────────────────────────────────────────
function mmQueuePDA(tier, season) {
  const tierBuf   = new Uint8Array([tier & 0xff]);
  const seasonBuf = new Uint8Array([season & 0xff, (season >> 8) & 0xff]);
  return solanaWeb3.PublicKey.findProgramAddressSync(
    [MM_SEED_QUEUE, tierBuf, seasonBuf],
    MM_PROGRAM_ID,
  );
}

// ── Connection (lazy) ─────────────────────────────────────────────────────
let _mmConn = null;
function mmConn() {
  if (!_mmConn) _mmConn = new solanaWeb3.Connection(MM_DEVNET_RPC, 'confirmed');
  return _mmConn;
}

// ── Matchmaking state ─────────────────────────────────────────────────────
let mmTier        = -1;        // currently queued tier (-1 = not queued)
let mmSeason      = 1;         // current season number
let mmPollTimer   = null;      // setInterval handle
let mmStartTime   = 0;         // Date.now() when entered queue
let mmMatchFound  = false;     // true when match ready
let mmOnMatch     = null;      // callback: (playerA, playerB) => void
let mmOnTick      = null;      // callback: (elapsedMs, queueLen) => void (for UI update)
let mmOnCancel    = null;      // callback: () => void

// ── Parse queue account ───────────────────────────────────────────────────
// Returns { tier, season, players: Pubkey[], created_at } or null
function mmParseQueueAccount(data) {
  if (!data || data.length < 8 + 1 + 2 + 4) return null;
  let o = 8; // skip discriminator
  const tier    = data[o++];
  const season  = data[o] | (data[o + 1] << 8); o += 2;
  const vecLen  = data[o] | (data[o+1]<<8) | (data[o+2]<<16) | (data[o+3]<<24); o += 4;
  const players = [];
  for (let i = 0; i < vecLen && o + 32 <= data.length; i++) {
    players.push(new solanaWeb3.PublicKey(data.slice(o, o + 32)));
    o += 32;
  }
  return { tier, season, players };
}

// ── Build transaction helper (replicates onchain.js pattern) ─────────────
async function mmBuildAndSend(instructionData, accounts) {
  if (!window.solana?.publicKey) throw new Error('Wallet not connected');
  const wallet = window.solana.publicKey;
  const conn   = mmConn();

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('confirmed');
  const tx = new solanaWeb3.Transaction({ recentBlockhash: blockhash, feePayer: wallet });
  tx.add(new solanaWeb3.TransactionInstruction({
    programId: MM_PROGRAM_ID,
    keys:      accounts,
    data:      Buffer.from(instructionData),
  }));

  const signed = await window.solana.signTransaction(tx);
  const sig    = await conn.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 3 });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');
  return sig;
}

// ── enter_queue ───────────────────────────────────────────────────────────
// Instruction data: disc(8) + tier(1) + season(2 LE)
// Accounts: queue(mut,init_if_needed), battle_stats(mut,init_if_needed),
//           player_state(mut,UncheckedAccount), player(mut,signer), system_program
async function enterQueue(tier, season, onMatch, onTick, onCancel) {
  if (mmTier !== -1) throw new Error('Already in a queue');
  if (!window.solana?.publicKey) throw new Error('Wallet not connected');

  const playerKey = window.solana.publicKey;
  mmSeason = season ?? 1;

  const [queuePDA] = mmQueuePDA(tier, mmSeason);
  const [statsPDA] = solanaWeb3.PublicKey.findProgramAddressSync(
    [MM_ENC.encode('player_battle_stats'), playerKey.toBytes()],
    MM_PROGRAM_ID,
  );
  // player_state PDA is game-specific; for queue we pass a dummy SystemProgram address
  // The instruction handles uninitialised player_state gracefully (UncheckedAccount)
  const playerStatePlaceholder = solanaWeb3.SystemProgram.programId;

  const d = await mmDisc('enter_queue');
  const buf = new Uint8Array(8 + 1 + 2);
  buf.set(d, 0);
  buf[8] = tier & 0xff;
  buf[9] = mmSeason & 0xff;
  buf[10] = (mmSeason >> 8) & 0xff;

  const accounts = [
    { pubkey: queuePDA,               isSigner: false, isWritable: true  },
    { pubkey: statsPDA,               isSigner: false, isWritable: true  },
    { pubkey: playerStatePlaceholder, isSigner: false, isWritable: true  },
    { pubkey: playerKey,              isSigner: true,  isWritable: true  },
    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  await mmBuildAndSend(buf, accounts);

  mmTier       = tier;
  mmMatchFound = false;
  mmOnMatch    = onMatch ?? null;
  mmOnTick     = onTick  ?? null;
  mmOnCancel   = onCancel ?? null;
  mmStartTime  = Date.now();

  mmPollTimer = setInterval(() => mmPoll(tier, mmSeason, queuePDA), MM_POLL_INTERVAL);
  console.log(`[MM] Entered ${['Bronze','Silver','Gold'][tier]} queue (tier=${tier} season=${mmSeason})`);
}

// ── leave_queue ───────────────────────────────────────────────────────────
// Instruction data: disc(8) + tier(1) + season(2 LE)
async function leaveQueue() {
  if (mmTier === -1) return;
  _mmStopPoll();

  const tier   = mmTier;
  const season = mmSeason;
  mmTier = -1;

  if (!window.solana?.publicKey) return;
  const playerKey = window.solana.publicKey;
  const [queuePDA] = mmQueuePDA(tier, season);

  const d = await mmDisc('leave_queue');
  const buf = new Uint8Array(8 + 1 + 2);
  buf.set(d, 0);
  buf[8] = tier & 0xff;
  buf[9] = season & 0xff;
  buf[10] = (season >> 8) & 0xff;

  const accounts = [
    { pubkey: queuePDA,   isSigner: false, isWritable: true },
    { pubkey: playerKey,  isSigner: true,  isWritable: true },
  ];

  try {
    await mmBuildAndSend(buf, accounts);
    console.log(`[MM] Left ${['Bronze','Silver','Gold'][tier]} queue`);
  } catch (e) {
    console.warn('[MM] leave_queue tx failed (may already be removed):', e.message);
  }

  if (mmOnCancel) mmOnCancel();
  mmOnMatch = null; mmOnTick = null; mmOnCancel = null;
}

// ── Poll queue PDA ────────────────────────────────────────────────────────
async function mmPoll(tier, season, queuePDA) {
  if (mmMatchFound || mmTier !== tier) return;

  const elapsed = Date.now() - mmStartTime;
  if (elapsed > MM_TIMEOUT_MS) {
    console.log('[MM] Queue timeout after 90s');
    _mmStopPoll();
    mmTier = -1;
    if (mmOnCancel) mmOnCancel();
    return;
  }

  try {
    const info = await mmConn().getAccountInfo(queuePDA);
    if (!info) { if (mmOnTick) mmOnTick(elapsed, 0); return; }

    const parsed = mmParseQueueAccount(new Uint8Array(info.data));
    if (!parsed) return;

    if (mmOnTick) mmOnTick(elapsed, parsed.players.length);

    if (parsed.players.length >= 2) {
      mmMatchFound = true;
      _mmStopPoll();
      mmTier = -1;
      const playerA = parsed.players[0];
      const playerB = parsed.players[1];
      console.log(`[MM] Match ready! ${playerA.toBase58().slice(0,6)}… vs ${playerB.toBase58().slice(0,6)}…`);
      if (mmOnMatch) mmOnMatch(playerA.toBase58(), playerB.toBase58());
    }
  } catch (e) {
    console.warn('[MM] Poll error:', e.message);
  }
}

function _mmStopPoll() {
  if (mmPollTimer) { clearInterval(mmPollTimer); mmPollTimer = null; }
}

// ── Accessors ─────────────────────────────────────────────────────────────
function mmIsInQueue()    { return mmTier !== -1; }
function mmCurrentTier()  { return mmTier; }

// ── Wire to lobby dialog ──────────────────────────────────────────────────
// Called from lobbyDialogConfirm() when action === 'find_match'
// Expects lobbyDialog.meta.tier to be set (0/1/2).
async function lobbyFindMatch(tierIdx) {
  if (!window.solana?.publicKey) {
    // No wallet — show info in dialog and return
    if (typeof lobbyDialog !== 'undefined' && lobbyDialog) {
      lobbyDialog.lines = ['Connect wallet to find a match.'];
      lobbyDialog.buttons = [{ label: 'Close', action: 'close', disabled: false }];
      lobbyDialog.focusIdx = 0;
    }
    return;
  }

  const tierNames = ['Bronze', 'Silver', 'Gold'];
  try {
    // Update dialog to "Waiting..." state
    if (typeof lobbyDialog !== 'undefined' && lobbyDialog) {
      lobbyDialog.lines = [`Joining ${tierNames[tierIdx]} queue…`, 'Waiting for opponent…', ''];
      lobbyDialog.buttons = [
        { label: 'Cancel', action: 'cancel_match', disabled: false },
      ];
      lobbyDialog.focusIdx = 0;
    }

    await enterQueue(
      tierIdx,
      1, // season 1
      // onMatch
      (playerA, playerB) => {
        if (typeof lobbyDialog !== 'undefined' && lobbyDialog) {
          lobbyDialog.title = '⚔️ Match Found!';
          lobbyDialog.lines = [
            `${tierNames[tierIdx]} duel starting…`,
            `${playerA.slice(0,6)}… vs ${playerB.slice(0,6)}…`,
            'Duel scene coming Day 5',
          ];
          lobbyDialog.buttons = [{ label: 'Close', action: 'close', disabled: false }];
          lobbyDialog.focusIdx = 0;
        }
      },
      // onTick
      (elapsedMs, queueLen) => {
        const sec = Math.floor(elapsedMs / 1000).toString().padStart(2, '0');
        if (typeof lobbyDialog !== 'undefined' && lobbyDialog) {
          lobbyDialog.lines[2] = `⏱ 00:${sec}  ${queueLen}/2 players`;
        }
      },
      // onCancel (timeout / manual cancel)
      () => {
        if (typeof lobbyDialog !== 'undefined' && lobbyDialog) {
          lobbyDialog.lines = ['Queue cancelled or timed out.'];
          lobbyDialog.buttons = [{ label: 'Close', action: 'close', disabled: false }];
          lobbyDialog.focusIdx = 0;
        }
      },
    );
  } catch (e) {
    const msg = MM_ERRORS[parseInt((e.message ?? '').match(/0x([0-9a-f]+)/i)?.[1] ?? '0', 16) + 6000]
              ?? e.message ?? 'Error entering queue';
    if (typeof lobbyDialog !== 'undefined' && lobbyDialog) {
      lobbyDialog.lines = [msg];
      lobbyDialog.buttons = [{ label: 'Close', action: 'close', disabled: false }];
      lobbyDialog.focusIdx = 0;
    }
    console.error('[MM] enterQueue error:', e);
  }
}
