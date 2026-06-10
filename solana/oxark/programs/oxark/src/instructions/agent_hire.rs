use crate::error::ErrorCode;
use crate::instructions::agent_registry::{AgentListing, AGENT_SEED};
use anchor_lang::prelude::*;

pub const AGENT_HIRE_SEED: &[u8] = b"agent_hire";

/// On-chain record of an x402-paid agent hire session.
///
/// Created by the hirer after completing the x402 payment to the facilitator.
/// The `payment_tx` field stores the Solana tx signature that was verified by
/// the facilitator — providing a verifiable audit trail linking the hire to
/// the actual SOL payment.
///
/// PDA seeds: `["agent_hire", hirer_pubkey, agent_id_le_bytes]`
#[account]
pub struct AgentHireSession {
    pub hirer: Pubkey,       // Player who hired the agent
    pub agent_owner: Pubkey, // Owner of the AgentListing (agent developer)
    pub agent_id: u32,       // Links to AgentListing PDA
    pub started_at: i64,     // Unix timestamp when hire was registered
    pub expires_at: i64,     // Unix timestamp when hire expires
    /// First 32 bytes of the Solana tx signature that funded the x402 payment.
    /// Full sig is stored off-chain; this field provides an on-chain audit link.
    pub payment_tx_lo: [u8; 32],
    pub payment_tx_hi: [u8; 32],
    pub active: bool,
    pub bump: u8,
}

impl Default for AgentHireSession {
    fn default() -> Self {
        Self {
            hirer: Pubkey::default(),
            agent_owner: Pubkey::default(),
            agent_id: 0,
            started_at: 0,
            expires_at: 0,
            payment_tx_lo: [0u8; 32],
            payment_tx_hi: [0u8; 32],
            active: false,
            bump: 0,
        }
    }
}

impl AgentHireSession {
    pub const SIZE: usize = 8 + 32 + 32 + 4 + 8 + 8 + 32 + 32 + 1 + 1;
}

#[derive(Accounts)]
#[instruction(agent_id: u32)]
pub struct RegisterAgentHire<'info> {
    #[account(
        init,
        payer = hirer,
        space = AgentHireSession::SIZE,
        seeds = [AGENT_HIRE_SEED, hirer.key().as_ref(), &agent_id.to_le_bytes()],
        bump,
    )]
    pub hire_session: Account<'info, AgentHireSession>,

    /// The AgentListing PDA — must be active before hire is valid.
    #[account(
        seeds = [AGENT_SEED, &agent_id.to_le_bytes()],
        bump = agent_listing.bump,
        constraint = agent_listing.active @ ErrorCode::AgentNotActive,
    )]
    pub agent_listing: Account<'info, AgentListing>,

    #[account(mut)]
    pub hirer: Signer<'info>,

    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_agent_hire(
    ctx: Context<RegisterAgentHire>,
    agent_id: u32,
    duration_seconds: i64,
    payment_tx_lo: [u8; 32],
    payment_tx_hi: [u8; 32],
) -> Result<()> {
    require!(duration_seconds > 0, ErrorCode::InvalidDuration);

    let now = ctx.accounts.clock.unix_timestamp;
    let session = &mut ctx.accounts.hire_session;

    session.hirer = ctx.accounts.hirer.key();
    session.agent_owner = ctx.accounts.agent_listing.owner;
    session.agent_id = agent_id;
    session.started_at = now;
    session.expires_at = now.saturating_add(duration_seconds);
    session.payment_tx_lo = payment_tx_lo;
    session.payment_tx_hi = payment_tx_hi;
    session.active = true;
    session.bump = ctx.bumps.hire_session;

    msg!(
        "AgentHireSession created: hirer={} agent_id={} expires_at={}",
        ctx.accounts.hirer.key(),
        agent_id,
        session.expires_at,
    );

    emit!(AgentHired {
        hirer: ctx.accounts.hirer.key(),
        agent_id,
        expires_at: session.expires_at,
    });

    Ok(())
}

#[event]
pub struct AgentHired {
    pub hirer: Pubkey,
    pub agent_id: u32,
    pub expires_at: i64,
}
