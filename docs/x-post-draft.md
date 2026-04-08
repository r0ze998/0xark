# X Post Drafts — 0xARK Development Updates

## Post 1: Announcement

Building 0xARK for @ColosseumOrg Frontier.

GI meets Dark Forest on Solana. ZK hidden hands, fog of war exploration, AI agents trading intel via x402.

Playable demo: https://r0ze998.github.io/0xark/

## Post 2: Gameplay Demo (with GIF/video)

0xARK gameplay loop:
- Explore fog-covered island
- Find cards in tall grass (area-specific drops)
- Encounter rivals → battle with hidden actions
- Collect all 5 types to win

Each card can be held for completion or consumed for power. The dilemma is real.

[attach gameplay GIF]

## Post 3: Tech Thread

0xARK tech stack:

Anchor/Rust smart contract with:
- Commit-reveal (SHA256 hash verification)
- Area-based card pools (Port/Forest/Ruins)
- Same-area constraint for Steal/Flame/Void
- Move action that costs your turn

ZK + x402 coming next.

Built for @ColosseumOrg Frontier.
