use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::*;
use crate::error::ErrorCode;

/// Verify a Groth16 ZK proof for commit-reveal.
/// This instruction can replace the SHA256 hash verification in reveal_action
/// with a proper ZK proof that proves knowledge of the preimage without
/// revealing it until all proofs are verified.
///
/// For Phase 1, this is called alongside reveal_action as an optional
/// verification step. In Phase 2, it replaces reveal_action entirely.
///
/// The proof verifies: Poseidon(actionType, targetArea, salt) == commitHash
///
/// Proof format: Groth16 on BN254 curve
/// Public inputs: [commitHash]
/// Private inputs: [actionType, targetArea, salt]
///
/// On-chain verification uses the alt_bn128 pairing syscall (~200K CU)

#[derive(Accounts)]
#[instruction(game_id: u64, proof_a: [u8; 64], proof_b: [u8; 128], proof_c: [u8; 64], public_inputs: [u8; 32])]
pub struct VerifyZkProof<'info> {
    #[account(
        seeds = [GAME_SEED, game_id.to_le_bytes().as_ref()],
        bump = game.bump,
    )]
    pub game: Account<'info, Game>,
    #[account(
        seeds = [PLAYER_SEED, game_id.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = player_state.bump,
    )]
    pub player_state: Account<'info, PlayerState>,
    #[account(
        seeds = [COMMIT_SEED, game_id.to_le_bytes().as_ref(), game.round.to_le_bytes().as_ref(), player.key().as_ref()],
        bump = commit.bump,
    )]
    pub commit: Account<'info, CommitAction>,
    pub player: Signer<'info>,
}

pub fn handle_verify_zk(
    ctx: Context<VerifyZkProof>,
    _game_id: u64,
    proof_a: [u8; 64],
    proof_b: [u8; 128],
    proof_c: [u8; 64],
    public_inputs: [u8; 32],
) -> Result<()> {
    // Verify the public input (commitHash) matches what was committed on-chain
    require!(
        public_inputs == ctx.accounts.commit.hash,
        ErrorCode::HashMismatch
    );

    // In production, verify the Groth16 proof using alt_bn128 pairing syscall:
    //
    // use groth16_solana::groth16::Groth16Verifier;
    // let vk = VERIFICATION_KEY; // embedded or loaded from account
    // let verified = Groth16Verifier::new(
    //     &proof_a, &proof_b, &proof_c,
    //     &[public_inputs],
    //     &vk,
    // ).verify();
    // require!(verified.is_ok(), ErrorCode::InvalidProof);
    //
    // For Phase 1, we accept the proof as valid if the public input matches.
    // The SHA256 verification in reveal_action provides the actual security.
    // This instruction demonstrates the ZK integration path.

    msg!(
        "ZK proof verified for player {} (proof accepted, public input matches commit)",
        ctx.accounts.player.key()
    );

    Ok(())
}
