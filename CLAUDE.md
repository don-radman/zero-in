# CLAUDE.md - Zero-In

Hackathon build: ETHGlobal Lisbon 2026, 0G track ("Best AI Product on 0G", $6k). Submission is SUNDAY July 26. Solo builder (Dan) + AI pair.

Read these before doing anything substantial:
- `zero-in-PRD.md` - product spec (scope is locked)
- `zero-in-build-plan.md` - stack, contracts, flows, schedule, submission checklist
- `docs/zero-in-full-context.md` - full background, rejected ideas (do not resurface them), BD context
- `AGENTS.md` - Next.js 16 conventions (breaking changes vs older App Router; check node_modules/next/dist/docs when unsure)

## Hard rules

1. **Priority order beats schedule: P0 (onboard, claim, patch, gravity, profile) > P1 (matching, intros, debrief) > P2 (dashboard, polish).** Whatever is green at T-3h before deadline IS the demo. Cut, don't debug, after that.
2. **No em dashes anywhere.** Docs, UI copy, comments, commit messages. Use commas, colons, parentheses, or a period.
3. **Language system (user-facing copy):** your Panda (never "agent NFT"), Patches (never stamps/badges), Gravity (never points), Ask the Room, Debrief, tiers Cadet/Explorer/Voyager/Legend. Banned words in UI: points, stamps, passport, NFT, landmark, degrees (as a metric).
4. **Honesty rules (README + demo + code comments):** contracts derive from 0G's simplified `agenticID-examples` (production path is full `0g-agent-nft` with TEE/ZKP verification). MVP matching runs centrally on 0G Compute over `authorizeUsage`-granted agents; true peer A2A is roadmap. Never overclaim.
5. **Commit early and often**, logical chunks. Event norm: no single-commit repos.
6. **Windows + PowerShell 5.1 environment**: no `&&` chaining in PS commands, prefer the Bash tool for POSIX. Watch UTF encoding when writing files via shell.

## Architecture decisions (settled, do not relitigate)

- **Wallets:** Privy embedded (email login, wallet invisible). Users NEVER sign gas transactions. All chain writes go through server-side relayer keys (MINTER_ROLE + OPERATOR_ROLE, round-robin over RELAYER_KEYS).
- **Gasless consent:** ZeroDev was evaluated (Dan's suggestion) and rejected for this build: their bundler/paymaster network list has no 0G chain (16602/16661). Instead `ZeroInAgent.sol` adds `authorizeUsageWithSig` (EIP-712): user signs typed data in Privy (free, gasless, silent), relayer submits. Consent remains cryptographically the owner's. ZeroDev goes in the roadmap if 0G gets 4337 infra.
- **Panda art:** generate portrait ONCE at onboarding (0G Compute Router image gen). Flags and patches are deterministic SVG overlays, never AI-generated. Evolution = frame/aura layers. Fallback: procedural SVG panda.
- **Next.js 16.2 / React 19 / Tailwind 4** (latest scaffold; build plan said 14, superseded).
- Solidity 0.8.27, evmVersion cancun, hardhat-toolbox (matches 0G's own example config).

## 0G quick reference (Galileo testnet)

| Param | Value |
|---|---|
| Chain ID | 16602 (0x40DA) |
| RPC | https://evmrpc-testnet.0g.ai |
| Explorer | https://chainscan-galileo.0g.ai |
| Storage indexer | https://indexer-storage-testnet-turbo.0g.ai |
| Compute Router | https://router-api.0g.ai/v1 (OpenAI-compatible, key from pc.0g.ai) |
| ERC-8004 Identity Registry | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| ERC-8004 Reputation Registry | 0x8004B663056A597Dffe9eCcC1965A193B7388713 |
| Pre-deployed AgenticID (spike target) | 0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F |
| Faucets | https://faucet.0g.ai + Google Cloud 0G faucet (fund 3-4 relayer keys) |

## Workflow

- Spikes before app code: `npx tsx scripts/spike-mint.ts` / `spike-compute.ts` / `spike-storage.ts`. All three must be green before building flows on top.
- Every 0G Compute call logs receipts to `docs/compute-proof.md` (hard submission requirement).
- Env in `.env` (never committed). `.env.example` documents every var and where to get it.
- Verify with `npm run dev` (app), `npx hardhat compile` (contracts), `npx hardhat test`.
