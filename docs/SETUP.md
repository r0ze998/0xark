# Setup Guide

## Prerequisites

- Node.js 20+ or Bun
- Rust 1.75+
- Anchor CLI 0.29+
- Solana CLI 1.18+

## Clone + Build

```bash
git clone https://github.com/r0ze998/0xark
cd 0xark

# Client
cd solana/client
node build.js

# Anchor program
cd ../oxark
anchor build
anchor deploy --provider.cluster devnet

# AI agent
cd ../../tools/ai-agent
bun install
cp .env.example .env  # add ANTHROPIC_API_KEY
bun run agent:start

# Multiplayer server
cd ../../multiplayer
bun install
bun run server.js
```

## Environment Variables

- `ANTHROPIC_API_KEY` — for AI agent (Anthropic Claude Haiku 4.5)
- `SOLANA_RPC_URL` — default: devnet (`https://api.devnet.solana.com`)

## Program IDs

- Main program (devnet): `5i37jWBiA7bV9XmokyDWHQxjJ5s1sBnSEkPSB4J2XfmN`

## Play

Open <https://r0ze998.github.io/0xark/> and connect Phantom (devnet mode).

Get test SOL from <https://faucet.solana.com/> (~0.5 SOL needed to play).
