# Delegation CPI Spec (for manual Rust CPI implementation)
# Generated: 2026-04-20, T7 research

## Program IDs

| Program | Address |
|---------|---------|
| Delegation Program (DLP) | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` |
| Magic Program | `Magic11111111111111111111111111111111111111` |
| Magic Context | `MagicContext1111111111111111111111111111111` |

Rust byte arrays:
```rust
// delegation program
Pubkey::new_from_array([181,183,0,225,242,87,58,192,204,6,34,1,52,74,207,151,184,53,6,235,140,229,25,152,204,98,126,24,147,128,167,62])
// magic program
Pubkey::new_from_array([5,69,180,36,176,218,112,149,236,185,214,222,195,119,215,40,145,182,231,142,146,234,18,214,223,187,58,64,0,0,0,0])
// magic context
Pubkey::new_from_array([5,69,180,36,196,165,40,191,95,180,3,47,68,82,130,142,187,56,171,193,210,220,151,247,63,139,148,84,128,0,0,0])
```

## DELEGATE Instruction

**Discriminator:** `[0, 0, 0, 0, 0, 0, 0, 0]` (8 zero bytes)

**Accounts (7, exact order):**
```
[0] payer              is_signer=true  is_writable=true
[1] delegated_account  is_signer=true  is_writable=true   ← PDA, signed via invoke_signed
[2] owner_program      is_signer=false is_writable=false
[3] delegate_buffer    is_signer=false is_writable=true   (created during CPI)
[4] delegation_record  is_signer=false is_writable=true
[5] delegation_metadata is_signer=false is_writable=true
[6] system_program     is_signer=false is_writable=false
```

**PDA seeds (all derived from DLP):**
```
delegate_buffer:      ["buffer",               delegated_account]  → owner = ownerProgram
delegation_record:    ["delegation",            delegated_account]  → owner = DLP
delegation_metadata:  ["delegation-metadata",   delegated_account]  → owner = DLP
```

**Data format (Borsh-like, manually constructed):**
```
[0,0,0,0,0,0,0,0]            discriminator (8 bytes, all zeros)
[ms as u32 LE]               commit_frequency_ms (4 bytes)
[n as u32 LE]                seeds.len() (4 bytes)
for each seed component:
  [len as u32 LE]            component length (4 bytes)
  [bytes...]                 component bytes
[0x00]                       validator: None (1 byte)
```

Example for Game PDA seeds = [b"game", game_id_le_8bytes]:
```
disc: 0,0,0,0,0,0,0,0
commit_frequency_ms: 184,11,0,0  (= 3000 = 0x0BB8)
seeds.len: 2,0,0,0
  seed[0].len: 4,0,0,0; bytes: 103,97,109,101  ("game")
  seed[1].len: 8,0,0,0; bytes: [game_id 8 bytes LE]
validator: 0
```

## UNDELEGATE (via Magic Program)

Sent to ER validator (not base layer). Instruction to Magic program.

**Data format (bincode):**
```
[2, 0, 0, 0]   bincode u32 discriminant for ScheduleCommitAndUndelegate (variant 2)
```

**Accounts (exact order):**
```
[0] payer              is_signer=true  is_writable=true
[1] magic_context      is_signer=false is_writable=true
[accounts to undelegate - each with their original signer/writable flags]
[N] game               is_signer=false is_writable=true
[N+1] player_state     is_signer=false is_writable=true
```

**Target program:** Magic Program ID

**Note:** This is sent to the ER validator, not base layer. The ER handles
commit_state + finalize + undelegate internally upon processing ScheduleCommitAndUndelegate.

## PDA Seed Constants (0xARK program)

```rust
GAME_SEED = b"game"
PLAYER_SEED = b"player"
// Game PDA: [b"game", &game_id.to_le_bytes()]
// Player PDA: [b"player", &game_id.to_le_bytes(), player_pubkey.as_ref()]
```

## Known Unknowns

1. Whether MagicBlockInstruction variant index is exactly 2 (assumed from source scan)
   - Risk: if wrong, magic program will reject. Fix: adjust byte.
2. Whether ScheduleCommitAndUndelegate has associated data beyond the discriminant
   - Assumed: unit variant → 4 bytes only. Fix: if magic program rejects, investigate.
