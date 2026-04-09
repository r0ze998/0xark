use anchor_lang::prelude::*;
use crate::error::ErrorCode;

/// Agent Registry — On-chain marketplace for AI agents.
/// Developers register their agents with strategy descriptions and pricing.
/// Players can browse and hire agents to play on their behalf.
///
/// Revenue model: Agent earns 95% of intel revenue, platform takes 5%.

#[account]
#[derive(Default)]
pub struct AgentListing {
    pub agent_id: u32,
    pub owner: Pubkey,          // Developer who deployed the agent
    pub name_hash: [u8; 32],    // SHA256 of agent name (stored off-chain)
    pub strategy_hash: [u8; 32], // SHA256 of strategy description
    pub endpoint_hash: [u8; 32], // SHA256 of x402 endpoint URL
    pub price_per_query: u64,    // Lamports per intel query
    pub total_queries: u64,      // Lifetime queries served
    pub total_revenue: u64,      // Lifetime revenue (lamports)
    pub rating: u16,             // Average rating (0-1000, divide by 100 for display)
    pub active: bool,
    pub bump: u8,
}

impl AgentListing {
    pub const SIZE: usize = 8 + 4 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 2 + 1 + 1;
}

pub const AGENT_SEED: &[u8] = b"agent";

#[derive(Accounts)]
#[instruction(agent_id: u32)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = AgentListing::SIZE,
        seeds = [AGENT_SEED, agent_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub agent: Account<'info, AgentListing>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_agent(
    ctx: Context<RegisterAgent>,
    agent_id: u32,
    name_hash: [u8; 32],
    strategy_hash: [u8; 32],
    endpoint_hash: [u8; 32],
    price_per_query: u64,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    agent.agent_id = agent_id;
    agent.owner = ctx.accounts.owner.key();
    agent.name_hash = name_hash;
    agent.strategy_hash = strategy_hash;
    agent.endpoint_hash = endpoint_hash;
    agent.price_per_query = price_per_query;
    agent.total_queries = 0;
    agent.total_revenue = 0;
    agent.rating = 500; // Default 5.0/10
    agent.active = true;
    agent.bump = ctx.bumps.agent;

    msg!("Agent {} registered by {}. Price: {} lamports/query",
        agent_id, ctx.accounts.owner.key(), price_per_query);

    emit!(AgentRegistered {
        agent_id,
        owner: ctx.accounts.owner.key(),
        price_per_query,
    });

    Ok(())
}

#[derive(Accounts)]
#[instruction(agent_id: u32)]
pub struct DeactivateAgent<'info> {
    #[account(
        mut,
        seeds = [AGENT_SEED, agent_id.to_le_bytes().as_ref()],
        bump = agent.bump,
        constraint = agent.owner == owner.key() @ ErrorCode::NotHost,
    )]
    pub agent: Account<'info, AgentListing>,
    pub owner: Signer<'info>,
}

pub fn handle_deactivate_agent(ctx: Context<DeactivateAgent>, _agent_id: u32) -> Result<()> {
    ctx.accounts.agent.active = false;
    msg!("Agent {} deactivated", ctx.accounts.agent.agent_id);
    Ok(())
}

#[event]
pub struct AgentRegistered {
    pub agent_id: u32,
    pub owner: Pubkey,
    pub price_per_query: u64,
}
