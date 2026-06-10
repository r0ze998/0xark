use crate::error::ErrorCode;
use crate::groth16::{self, hand_commitment_vk};
use crate::state::ZkProofRecord;
use anchor_lang::prelude::*;

// ─── Instruction ─────────────────────────────────────────────────────────

/// Public inputs layout (matches snarkjs publicSignals order):
///   [0] = commitment  — Poseidon(round, pubkey_lo, pubkey_hi, card_ids[10], salt_lo, salt_hi)
///   [1] = round       — round number 1-5 as field element
///   [2] = pubkey_lo   — bytes[0..16] of signer pubkey as u128 field element
///   [3] = pubkey_hi   — bytes[16..32] of signer pubkey as u128 field element
#[derive(Accounts)]
#[instruction(proof_a: [u8; 64], proof_b: [u8; 128], proof_c: [u8; 64], public_inputs: [[u8; 32]; 4], duel_pda: Pubkey, round: u64)]
pub struct VerifyZkProof<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Replay prevention — `init` fails if the PDA already exists (already verified).
    #[account(
        init,
        payer = signer,
        space = ZkProofRecord::SIZE,
        seeds = [
            ZkProofRecord::SEED,
            duel_pda.as_ref(),
            round.to_le_bytes().as_ref(),
            signer.key().as_ref(),
        ],
        bump,
    )]
    pub zk_proof_record: Account<'info, ZkProofRecord>,

    pub system_program: Program<'info, System>,
}

pub fn handle_verify_zk(
    ctx: Context<VerifyZkProof>,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    public_inputs: [[u8; 32]; 4],
    duel_pda: Pubkey,
    round: u64,
) -> Result<()> {
    // Validate round matches public_inputs[1]
    require!(
        public_inputs[1] == groth16::u64_to_field(round),
        ErrorCode::ZkRoundMismatch
    );

    // Validate signer pubkey matches public_inputs[2] (lo) and [3] (hi)
    let (expected_lo, expected_hi) = groth16::split_pubkey(ctx.accounts.signer.key);
    require!(public_inputs[2] == expected_lo, ErrorCode::ZkPubkeyMismatch);
    require!(public_inputs[3] == expected_hi, ErrorCode::ZkPubkeyMismatch);

    // Compute vk_x and run Groth16 pairing check
    let vk_x = groth16::compute_vk_x(
        &hand_commitment_vk::IC0,
        &hand_commitment_vk::IC_REST,
        &public_inputs,
    )?;
    let valid =
        groth16::groth16_verify(&hand_commitment_vk::VK, &proof_a, &proof_b, &proof_c, &vk_x)?;
    require!(valid, ErrorCode::ZkProofInvalid);

    // Persist record — replay is blocked at the account level by `init`
    let record = &mut ctx.accounts.zk_proof_record;
    record.duel_id = duel_pda;
    record.round = round;
    record.signer = *ctx.accounts.signer.key;
    record.commit = public_inputs[0];
    record.verified_at = Clock::get()?.unix_timestamp as u64;
    record.bump = ctx.bumps.zk_proof_record;

    msg!(
        "ZK proof verified: duel={} round={} signer={}",
        duel_pda,
        round,
        ctx.accounts.signer.key(),
    );

    Ok(())
}
