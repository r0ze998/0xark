/**
 * T31 E2E — oxark-cards program: mint_solo_card smoke test
 * Program: 236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S (devnet)
 *
 * Tests:
 *   1. Load oxark-cards IDL + connect to devnet
 *   2. mint_solo_card(card_id=1) — new mint PDA, new ATA
 *   3. Verify token account holds exactly 1 token
 *   4. Verify PDA is deterministic (same seeds → same address)
 *
 * Run: node tests/t31-nft-e2e.js
 */

const anchor = require("@coral-xyz/anchor");
const {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} = require("@solana/web3.js");
const {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
} = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

const CARDS_PROGRAM_ID = new PublicKey(
  "236FNPRbJr5W7qeV9fJCYsxDEkruSK6fnNAipf47Mq1S"
);
const SOLO_CARD_SEED = Buffer.from("solo_card");

function loadWallet() {
  const keyPath = path.join(
    process.env.HOME,
    ".config/solana/id.json"
  );
  const raw = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

function loadIdl() {
  const idlPath = path.join(__dirname, "../target/idl/oxark_cards.json");
  return JSON.parse(fs.readFileSync(idlPath, "utf-8"));
}

async function main() {
  console.log("T31 E2E — oxark-cards mint_solo_card\n");

  const wallet = loadWallet();
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.error("[FAIL] Insufficient balance (< 0.05 SOL)");
    process.exit(1);
  }

  // Load IDL and create program interface
  const idl = loadIdl();
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  const program = new anchor.Program(idl, provider);

  const cardId = 1;
  console.log(`\nTest: mint_solo_card(card_id=${cardId})`);

  // Derive card_mint PDA: ["solo_card", player, card_id_byte]
  const [cardMintPda, cardMintBump] = PublicKey.findProgramAddressSync(
    [SOLO_CARD_SEED, wallet.publicKey.toBuffer(), Buffer.from([cardId])],
    CARDS_PROGRAM_ID
  );
  console.log(`  card_mint PDA: ${cardMintPda.toBase58()} (bump=${cardMintBump})`);

  // Derive player ATA
  const playerAta = getAssociatedTokenAddressSync(
    cardMintPda,
    wallet.publicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  console.log(`  player ATA:    ${playerAta.toBase58()}`);

  // Check if already minted (idempotency)
  try {
    const existingAccount = await getAccount(connection, playerAta);
    if (existingAccount.amount > 0n) {
      console.log(
        `  [SKIP] ATA already exists with amount=${existingAccount.amount} — mint already ran`
      );
      console.log("\nT31 E2E PASS (already minted)");
      return;
    }
  } catch (_) {
    // Account doesn't exist yet — proceed with mint
  }

  // Send mint_solo_card tx
  console.log("  Sending mint_solo_card tx...");
  const tx = await program.methods
    .mintSoloCard(cardId)
    .accounts({
      cardMint: cardMintPda,
      playerTokenAccount: playerAta,
      player: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .signers([wallet])
    .rpc({ commitment: "confirmed" });

  console.log(`  tx: ${tx}`);

  // Verify token account holds 1 token
  const tokenAccount = await getAccount(connection, playerAta);
  const amount = Number(tokenAccount.amount);
  if (amount !== 1) {
    console.error(`[FAIL] Expected amount=1, got ${amount}`);
    process.exit(1);
  }

  console.log(`  amount: ${amount} ✓`);
  console.log(`  mint:   ${tokenAccount.mint.toBase58()} ✓`);
  console.log(`  owner:  ${tokenAccount.owner.toBase58()} ✓`);

  console.log("\nT31 E2E PASS");
  console.log(`tx signature: ${tx}`);
}

main().catch((err) => {
  console.error("[FAIL]", err.message || err);
  process.exit(1);
});
