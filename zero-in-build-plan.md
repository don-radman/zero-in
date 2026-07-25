# Zero-In - Technical Build Plan (Claude Code handoff)

Companion to `zero-in-PRD.md`. This doc is the *how*: stack, contracts, integrations, repo layout, schedule with tripwires, and the submission checklist. Solo builder + AI pair. Today is **Saturday** - submission is Sunday. Priority order beats schedule: **P0 = demoable core loop, P1 = agent intros, P2 = dashboard & polish.**

---

## 1. Network & endpoints (0G Galileo testnet)

| Param | Value |
|---|---|
| Chain ID | **16602** (hex `0x40DA`) |
| RPC | `https://evmrpc-testnet.0g.ai` |
| Explorer | `https://chainscan-galileo.0g.ai` |
| Faucets | `https://faucet.0g.ai` (0.1 0G/day) + Google Cloud 0G Galileo faucet - hit BOTH, fund 3-4 relayer keys; ask 0G booth for top-up |
| Storage indexer | `https://indexer-storage-testnet-turbo.0g.ai` |
| Storage explorer | `https://storagescan-galileo.0g.ai` |
| Compute Router | `https://router-api.0g.ai/v1` (OpenAI-compatible; key `sk-…` from pc.0g.ai dashboard, needs small deposit - confirm w/ booth) |
| ERC-8004 Identity Registry (Galileo) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation Registry (Galileo) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Pre-deployed example AgenticID (spike target) | `0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F` |

Reference repos: `0gfoundation/agenticID-examples` (contract source we fork - example 01), `0gfoundation/0g-agent-nft` (production reference, cite in README), `0gfoundation/0g-storage-ts-sdk`.

## 2. Stack

- **App:** Next.js 14 (App Router) + Tailwind, deployed on **Vercel**.
- **Wallets:** **Privy** embedded wallets (email login; wallet invisible to user). Note in README: Privy ♥ (their Madeleine mentors 0G's Apollo cohort).
- **Chain access:** viem + a server-side **relayer** (3-4 funded keys, round-robin) holding `MINTER_ROLE`/`OPERATOR_ROLE`. Users never sign or pay gas.
- **DB:** Supabase Postgres (Dan has an account) via Prisma or supabase-js.
- **Storage:** `@0gfoundation/0g-storage-ts-sdk` - encrypt (AES-256-GCM, per-user key) → `indexer.upload` → keep root hash.
- **Inference & image gen:** OpenAI SDK pointed at the Router (`baseURL: https://router-api.0g.ai/v1`). Chat model e.g. `zai-org/GLM-5-FP8` (check `GET /v1/models`). Images: `POST /v1/images/generations` with `response_format: "b64_json"` (async endpoint if slow). **Log request IDs/receipts + provider addresses → `docs/compute-proof.md`** (submission requirement).
- **Email:** Resend (magic links for debrief + intro notifications).
- **NFC:** tags carry `https://<app>/z/<eventId>?k=<claimKey>`; rotating-QR fallback page at `/host/<eventId>/screen` (HMAC(eventSecret, 45s timeslice), claim token TTL 90s).

## 3. Contracts (Hardhat, Solidity 0.8.24)

**`ZeroInAgent.sol`** - fork of examples' `AgenticID.sol` (ERC-7857 simplified) with additions:
```solidity
// ADD: append-only intelligent data (agent growth events)
function appendIntelligentData(uint256 tokenId, IntelligentData calldata data)
    external onlyRole(OPERATOR_ROLE);           // emits IntelligentDataAppended
// KEEP: iMintWithRole(to, datas, creator)      - relayer mints at onboarding
// KEEP: setTokenURI (OPERATOR_ROLE)            - dynamic art updates
// KEEP: authorizeUsage / batchAuthorizeUsage   - member grants matcher, revocable
// KEEP: delegateAccess                          - documented, not used in MVP
```
Mint-time `IntelligentData[]`: `{"profile_v1", keccak(profileJson)}`, `{"memory_root", storageRootHash}`. Per patch/debrief: append `{"patch:<eventId>", hash}` / `{"debrief:<eventId>", hash}`.

**`ZeroInPatches.sol`** - ERC-1155. tokenId = eventId; `claim(address to, uint256 eventId)` (relayer, MINTER_ROLE) enforces one-per-wallet + cap + window; stores edition number + trust tier (`venue`); per-event `uri` → our tokenURI API.

**8004 registration:** script calls Identity Registry `register/newAgent` per minted agent (agent card JSON hosted at `/api/agent-card/<tokenId>`); store returned `agentId`; link 8004scan in UI.

**Honesty note in README:** contracts derive from 0G's own simplified examples; production path = full `0g-agent-nft` with TEE/ZKP verifier (quote their README line).

## 4. Repo layout

```
zero-in/
  contracts/            # ZeroInAgent.sol, ZeroInPatches.sol, interfaces/ (copied from examples)
  scripts/              # deploy.ts, register8004.ts, spike-*.ts
  src/app/              # Next.js routes
    z/[eventId]/        # claim flow (NFC/QR entry)
    onboard/            # email→questions→panda hatch
    me/                 # profile, patches, "what my panda knows"
    host/[eventId]/     # issuer: create/manage, screen (rotating QR), dashboard
    api/                # onboard, claim, intent, match, suggestion, debrief,
                        # tokenuri/[kind]/[id], agent-card/[id], og-card/[id]
  src/lib/              # chain.ts (viem+relayer), storage.ts, compute.ts (router),
                        # privy.ts, panda.ts (gen+compose), gravity.ts, match.ts
  src/svg/              # flags/, suit frames, patch frames, aura layers
  docs/                 # compute-proof.md, trust-model.md, demo-script.md
  zero-in-PRD.md  zero-in-build-plan.md  README.md
```

## 5. DB schema (sketch)

`users`(id, email, wallet, privyId, country, socials json, consentScope, createdAt)
`agents`(userId, tokenId, agentId8004, memoryRoot, pandaImageUrl, pandaPrompt, gravity, tier)
`events`(id, issuerId, name, startsAt, endsAt, cap, claimKey, question, patchArtUrl, tier)
`patches`(eventId, userId, edition, txHash, claimedAt, emojiPulse, debriefDone)
`intents`(userId, eventId, lookingFor, logistics json, answerAskRoom_enc)
`suggestions`(id, eventId, userA, userB, reason, window, status[pending|a_yes|b_yes|matched|expired], expiresAt)
`memories`(userId, kind, content_enc, storageRoot, createdAt)  - mirror of what's pushed to 0G Storage

## 6. Key flows (pseudocode-level)

**Onboard:** Privy auth → questions → `panda.generate(answers)` (Router image gen → 0G Storage + cache) → relayer: `iMintWithRole` w/ profile hashes → `authorizeUsage(tokenId, MATCHER_ADDR)` prompt (one tap, explained) → 8004 register (async queue) → hatch screen.
**Claim:** validate claimKey/TTL + window + one-per-wallet → `ZeroInPatches.claim` → gravity +20/+30 → `appendIntelligentData(patch:…)` → memory append→Storage→update memoryRoot → trigger match run → optional emoji.
**Match run (per event):** cohort = claimed ∩ consent ∩ authorized → build pair candidates → one Router chat call per top-K pairs ("reason + shared window, JSON out") → upsert suggestions (≤3 active/member) → notify.
**Accept/accept:** second yes → Router generates intro message (attribution to initiator's panda, includes time/place) → email both + in-app thread stub → +10 gravity each → memory append both.
**Debrief (cron or delayed job, `DEBRIEF_DELAY`):** email magic link → 3-turn chat (Router) → patch upgrade + gravity +10 → aggregate refresh.
**Aggregates:** on dashboard load: if cohort ≥5 → Router synthesis of Ask-the-Room + stats; cache 5 min.

## 7. Schedule & tripwires (Saturday → Sunday)

**SAT AM - spikes (do first, in order):**
1. Accounts/env: both faucets ×4 keys · pc.0g.ai Router key + tiny deposit · Privy app · Supabase · Vercel · Resend.
2. `spike-mint.ts`: `iMint` against **pre-deployed** `0x2700…EF1F` → explorer link. (Proves 7857 path with zero deploys.)
3. `spike-compute.ts`: Router chat + one image generation → save receipts to `docs/compute-proof.md`.
4. `spike-storage.ts`: upload/download one encrypted blob → root hash.
   *All three green before writing app code.*

**SAT PM - P0 core loop:** deploy both contracts → onboarding e2e (Privy → questions → panda gen → mints) → claim flow e2e (URL → patch → gravity → profile updates). **Checkpoint 18:00:** contracts not deployed? → run MVP on pre-deployed example contract + our Patches only. **19:00:** image gen unreliable? → procedural SVG panda fallback (same traits).
**SAT EVE - P0 finish + seed:** profile/share card · intent registration · rotating-QR page · write 2 NFC tags · **onboard 10-20 real hackers at the venue** (live data + leads) · 8004 registration script.
**SUN AM - P1 agent:** match run + suggestion cards + double-opt-in intro flow + debrief (2-min demo mode) + "what my panda knows."
**SUN - P2 + ship:** issuer dashboard w/ aggregates · README (features table, trust model, honesty notes, addresses) · 3-min video · submission form · demo dry-run. **Hard rule: whatever is green by T-3h is the demo; cut, don't debug, after that.**

## 8. Submission checklist (0G track)

- [ ] Project name + short description (one-liner from PRD §1)
- [ ] Contract addresses (ZeroInAgent, ZeroInPatches) + explorer links
- [ ] Agentic ID on explorer + 8004scan link (prize brief requirement)
- [ ] Public GitHub repo, README w/ setup + architecture + which-0G-features table (all four pillars + 7857 + 8004)
- [ ] **Proof of 0G Compute inference** - `docs/compute-proof.md` (router receipts, provider addrs, sample payloads)
- [ ] Live demo link (Vercel) + demo video ≤3 min
- [ ] Team + contacts (TG & X)
- [ ] Git hygiene: commit early/often (1inch-style "no single-commit" norms are event-wide vibes)

## 9. Risk register

| Risk | Mitigation |
|---|---|
| Faucet gas starvation | 2 faucets × 4 keys, booth top-up, cheap 1155 batch ops |
| Router needs deposit / latency | Fund Sat AM; async image endpoint; cache generations; chat fallback = smaller model from `/v1/models` |
| 7857 fork friction | Pre-deployed example contract fallback (already live) |
| Image-gen inconsistency | Fixed prompt template; fallback procedural SVG (Sat 19:00 tripwire) |
| NFC tag issues | Rotating-QR page is the same endpoint; tags are theater, not dependency |
| Cohort cold-start | Seed 10-20 hackers Sat evening; onboard judges live in demo |
| Email deliverability | In-app cards are primary surface; email is secondary |

## 10. Env vars

`PRIVY_APP_ID/SECRET` · `RELAYER_KEYS` (csv) · `OG_RPC_URL` · `AGENT_CONTRACT` · `PATCHES_CONTRACT` · `ROUTER_API_KEY` · `ROUTER_BASE_URL` · `STORAGE_INDEXER_URL` · `SUPABASE_URL/KEY` · `RESEND_KEY` · `CLAIM_HMAC_SECRET` · `DEBRIEF_DELAY` · `MATCHER_ADDR` · `NEXT_PUBLIC_EXPLORER=https://chainscan-galileo.0g.ai`
