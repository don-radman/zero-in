# Zero-In

**The presence layer for communities. Zero degrees of separation.**

POAP made attendance collectible. Zero-In makes it count: status you can flex,
people you actually meet, and a memory that compounds, while the community team
finally sees one connected graph instead of fifty disconnected guest lists.

Every member gets a personal AI agent (an Agentic ID on 0G) embodied as a unique
astronaut space panda. Showing up at events earns numbered Patches sewn onto its
suit and Gravity toward the community's status ladder. The agent privately learns
who you are and what you're looking for, then connects you with the right people
in the room via double-opt-in intros. The community gets aggregate intelligence
it has never had, never individual data.

> "We don't ask members to trust Zero-In with their data. The token standard
> makes it impossible for Zero-In to have it."

Built solo + AI pair at ETHGlobal Lisbon 2026 for the 0G track, implementing the
flow a 0G team member described to us at the booth on Friday.

## How Zero-In uses 0G

| 0G feature | Where it runs in Zero-In |
|---|---|
| 0G Chain (Galileo, 16602) | `ZeroInAgent` (ERC-7857 Agentic ID) + `ZeroInPatches` (ERC-1155 per-event editions) |
| 0G Compute (Router) | Panda portrait generation, match reasoning, intro messages, debrief chat, Ask-the-Room synthesis. Receipts: [docs/compute-proof.md](docs/compute-proof.md) |
| 0G Storage | Encrypted agent memory (AES-256-GCM per user); merkle root hash committed on-chain as `IntelligentData` |
| ERC-7857 (Agentic ID) | Agent token with encrypted intelligent data, `authorizeUsage` consent, append-only growth per patch/debrief |
| ERC-8004 | Every agent registered in the Identity Registry, discoverable on 8004scan |

## Deployed contracts (0G Galileo testnet)

| Contract | Address | Explorer |
|---|---|---|
| ZeroInAgent (ERC-7857) | TBD after deploy | TBD |
| ZeroInPatches (ERC-1155) | TBD after deploy | TBD |
| Example Agentic ID minted | TBD | TBD (+ 8004scan link) |

## Architecture

- **Next.js 16 + Tailwind on Vercel.** Wallets are Privy embedded (email login,
  wallet invisible); users never sign transactions or pay gas.
- **Relayer pattern:** funded server-side keys hold MINTER_ROLE/OPERATOR_ROLE and
  submit every write, round-robin.
- **Gasless on-chain consent:** `authorizeUsageWithSig` (EIP-712). The member
  signs typed data in their embedded wallet (free); the relayer submits it. The
  matcher can only run agents whose owners signed. Revocable the same way.
- **Panda art:** portrait generated once on 0G Compute; country flag and patches
  are deterministic SVG overlays (flags are never AI-generated); tier evolution
  is frame/aura layers on a constant portrait.
- **Trust model:** attestation is a policy per patch type. See
  [docs/trust-model.md](docs/trust-model.md).

## Honesty notes

- Contracts derive from 0G's own simplified
  [`agenticID-examples`](https://github.com/0gfoundation/agenticID-examples)
  ("simplified for demonstration"); the production path is the full
  [`0g-agent-nft`](https://github.com/0gfoundation/0g-agent-nft) suite with
  TEE/ZKP transfer verification.
- MVP matching runs centrally on 0G Compute over agents that granted
  `authorizeUsage`: semantically agent-to-agent, mechanically one matcher. True
  peer A2A negotiation via ERC-8004 discovery is roadmap.
- Demo NFC tags are static-URL ("venue-attested-lite"); production uses NTAG 424
  rotating auth.

## Setup

```bash
npm install
cp .env.example .env   # fill in keys (each var documented in the file)
npx hardhat compile

# spikes (run these before anything else; all three must be green)
npx tsx scripts/spike-mint.ts
npx tsx scripts/spike-compute.ts
npx tsx scripts/spike-storage.ts

# deploy + register
npx hardhat run scripts/deploy.ts --network zgGalileo
npx tsx scripts/register8004.ts

npm run dev
```

Thanks to Privy for embedded wallets that make the wallet invisible (and for
mentoring 0G's Apollo cohort).

## Team

Dan Rodman, Co/Unity ([@don-radman](https://github.com/don-radman)). Contacts: TBD (TG / X).
