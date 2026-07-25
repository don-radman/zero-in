# Zero-In - Full Context Document

Complete background on the Zero-In project for any AI assistant or collaborator joining mid-stream. Everything below was researched, discussed, and decided across a working session on July 24-25, 2026 (ETHGlobal Lisbon hackathon weekend). Companion docs: `zero-in-PRD.md` (product spec) and `zero-in-build-plan.md` (technical plan).

---

## 1. Who is building this and why

**Dan Rodman** runs **Co/Unity**, a niche community-building agency for web3 (structure, experiences, ambassador programs). Core positioning: **GTC - go-to-community** vs go-to-market: value creation and retention over paid attention. Productized asset: the **AMS (Ambassador Management System)**. Co/Unity's sales thesis in the current bear market: concentrate on "whales" - large, well-funded ecosystems where one deal could double company revenue. **0G is one of three named whale targets.**

**The play:** Dan entered ETHGlobal Lisbon 2026 explicitly as a BD wedge - build a community tool on 0G's stack to enter their ecosystem from the *builder* side, not the vendor side. A prize placement buys conversations and credibility; the tool demos the thesis; Co/Unity's paid services (strategy + operations) are the actual product behind it. Solo builder + heavy AI assistance (Claude), ~2 days.

**Prior 0G groundwork:** Dan has a full business-fit pitch ("0G BFP v6," June 2026) mapping five service areas: (1) global tiered ambassador program, (2) Apollo accelerator cohort community packages, (3) **an "Agentic 0G Passport" - stamps + ERC-7857 paired agent** (the seed of this project), (4) "0G Grounded" wellness community, (5) Discord re-architecture. Warm path to 0G: Alex Bowman (Voyager founder, 0G ecosystem) is brokering an intro to Mike D (0G head of success). 0G's CEO-level thesis: **"the future of AI is community-owned."** Apollo cohort Demo Day is July 29 - five days after the hackathon.

**Key learnings from Dan's history shaping decisions here:**
- *Stellar lesson:* leading a pitch with a product got Co/Unity mis-filed as "a platform" and compared to tools. The hackathon build is a credibility artifact; the client conversation must lead with strategy + operations.
- *Don't copy Stellar Passport optics* - Dan's original idea resembled Stellar Passport (stamps/passport); all "passport/stamp" language was deliberately replaced.
- *Pre-hack playbook:* learn sponsor objectives before locking the build (done - see §5); build something with life after the hackathon.

## 2. Event context

**ETHGlobal Lisbon 2026** (July 24-26, Lisbon). 8 sponsors, ~$88k total. Relevant track: **0G - "Best AI Product on 0G" ($6,000: 3k/2k/1k)**. 0G also runs an infra/tooling track ($4.5k) and a Continuity track (not applicable - this is a new build). 0G's own example idea in the prize brief matches this project almost verbatim: *"Agent minted as an Agentic ID with embedded intelligence (encrypted on 0G Storage), persistent memory, and dynamic upgrades."*

**0G submission requirements:** project name/description; contract deployment addresses; public GitHub repo w/ README; demo video ≤3 min; live demo link; explanation of which 0G features/SDKs used; team contacts; a working demoable product; **proof that 0G Compute is used for inference**; for Agentic ID projects, **link to the minted Agentic ID on the 0G explorer**.

Other sponsor prizes (ENS agent-naming, World ID sybil-resistance, The Graph) were considered as stacks and consciously set aside to keep the build 0G-pure. They live in the roadmap.

## 3. Concept evolution (what was tried and rejected - do not resurface these)

1. **"Stellar Passport for 0G"** (stamps + passport) → rejected wording: too obviously derivative of Stellar Passport. Concept kept, language replaced.
2. **Naming round 1** (Constellation, Orbit, Gravity-as-name, Bamboo, Starlog…) → several killed by conflicts (Arbitrum Orbit, Galxe's Gravity chain, echo.xyz). Round 2 produced **Zero-In** (chosen) and "zero degrees of separation" (kept as tagline only).
3. **Peer-to-peer reciprocal scanning / social-graph edges ("drop a dot")** → cut for scope. Matching works on co-attendance + profiles; peer scanning is roadmap.
4. **NPS/survey-first "Pulse" framing** → redirected after Dan's pushback: the data layer is **attendee intelligence** (who's here, what they're building, what they need - including one issuer-chosen "**Ask the Room**" question per event), not satisfaction scoring. A single optional emoji at claim is the only satisfaction signal.
5. **Creature explorations** (star-dragon, 0tter+pebbles, red panda+lanterns, constellation-beast) → settled: **astronaut space panda** (0G's mascot is a panda), AI-generated per member, **country flag sticking out of its backpack**.
6. **Unit explorations** (dots, seals, crests, moonrocks, moons, bamboo) → settled: **Patches** (astronaut mission-patch culture; numbered editions; issuer-designed artwork; worn on the suit).
7. **Tiers wired to 0G's Discord role ladder** → cut per Dan (overcomplication). Simple config-driven tier names (Cadet/Explorer/Voyager/Legend placeholders).
8. **"Degrees" closeness metric** → cut per Dan. Tagline survives; no in-app metric.
9. **"Doors"/perks system** → parked for later elaboration; not in MVP language.
10. **Google/Apple Photos auto-backfill** → too heavy (API restrictions, OAuth review). Scoped alternative on roadmap: drag-and-drop photos, EXIF (time+GPS) parsed client-side in browser, photo never uploaded, mints a lower-trust "self-attested" patch.
11. **Google Calendar integration** → MVP uses self-declared logistics ("when do you fly out?"); free/busy OAuth is a stretch; full calendar-in-TEE is the roadmap flagship privacy story.
12. **Mario/Lisbon-hub-specific build** → de-scoped per Dan. He's a first-operator *candidate* and BD conversation, not a build dependency.

## 4. Validation from the 0G team (Friday booth conversation)

A 0G team member independently described nearly the same product: one Agentic ID per person; register intent to attend an event; collect proof-of-presence; the agent privately checks account + event data; agents talk to other agents; **double-opt-in intros** with a reason and shared logistics (his example: *"here's a person who also has a later flight out and you both share xyz - want to meet?"* → both yes → *"NAME's agent thought we should connect because xyz, suggested coffee"*). The build implements this flow - quote it back in the submission and demo ("we built what your team described to us Friday").

## 5. The locked concept

**Zero-In** - the presence layer for communities. One-liner: *POAP made attendance collectible. Zero-In makes it count - status you can flex, people you actually meet, a memory that compounds - while the community team finally sees one connected graph instead of fifty disconnected guest lists.* Tagline: **"Zero degrees of separation."**

**Language system:** Zero-In (product + verb) · **your Panda** (astronaut space panda = your Agentic ID agent; AI-generated, unique, country flag in backpack) · **Patches** (per-event collectible, numbered editions, issuer-designed) · **Gravity** (status metric; never "points") · simple tiers (Cadet→Explorer→Voyager→Legend, placeholders) · **Ask the Room** (issuer's one custom question/event) · **Debrief** (agent-led next-morning follow-up). Banned words: points, stamps, passport, NFT (user-facing), landmark, degrees (as metric).

**The loop:** onboard once via email (invisible wallet via Privy; agent + panda minted by relayer; 4 questions: country, what you're building, what you're looking for, consent; optional social handles as plain text) → register intent for an event (what you seek here + logistics like flight-out + Ask-the-Room) → tap NFC at venue → patch mints (edition #N), gravity up, intent live → agent matches within consenting cohort on 0G Compute (interests × complementarity × shared time windows) → double-opt-in → intro message with reason + suggested time/place → next-morning Debrief (3 conversational questions; completing upgrades patch art + unlocks more intros) → issuer sees **aggregates only** (min cohort 5).

**Value:** members get the flex (unique panda, numbered patches, gravity), the people (3 warm intros with reasons + time windows), and the memory ("who did I meet today?" - private personal CRM). Hosts get 30-second event creation, an NFC tag, and a next-morning recap. HQ gets one cross-event graph, regional intelligence, events→builders attribution, Ask-the-Room insights - and every member dogfoods 0G's stack.

## 6. Why it must be an Agentic ID (the five-primitive argument)

| ERC-7857 primitive | Function in Zero-In | Breaks without it |
|---|---|---|
| Encrypted intelligent data | Agent memory (goals, logistics, people met) | Public metadata doxxes members; a private DB makes the platform the owner |
| On-chain hash per entry | Provable-but-unreadable growth per patch/debrief | Gravity = unverifiable app points |
| `authorizeUsage` | Revocable on-chain consent for the matcher to run your agent | Consent = ToS checkbox |
| TEE re-encrypting transfer/clone | The learned agent is a portable asset | "Own your network" = slogan (roadmap-tier; stated honestly) |
| ERC-8004 registration | Agents discoverable on 8004scan; cross-app agent-to-agent | A2A stays one app's internal feature |

Quotable line: **"We don't ask members to trust Zero-In with their data - the token standard makes it impossible for Zero-In to have it."** Honesty rule: MVP matching runs centrally on 0G Compute over `authorizeUsage`-granted agents; true peer A2A negotiation is roadmap. Never overclaim.

## 7. Trust & verification model

Every patch is labeled with how it was earned. Ladder: time-boxed claims → **venue-attested** (NFC tag / rotating QR: HMAC-signed token per ~45s timeslice, 90s TTL - MVP tier) → witnessed (host approval) → reciprocal peer-scan (roadmap; anti-fraud = the connection mechanic itself) → hardware (NTAG 424 rotating auth) / proof-of-human (World ID) on roadmap. Photo backfill (roadmap) = **self-attested** tier, never gates rewards; photos parsed client-side (EXIF), file-hash dedup, screenshots/messenger images fail naturally (EXIF stripped). Principle: assurance is a *policy per patch type*; fraud incentive scales with attached rewards; demo tags are honest about being static-URL ("venue-attested-lite," production = NTAG 424).

## 8. Data & privacy model

Three rings: **public on-chain** (wallet, agent token, data *hashes*, patches + editions, 8004 registration - pseudonymous; email↔wallet map never on-chain) · **encrypted agent memory** on 0G Storage, root hash on-chain (profile, intents, logistics, people met, individual answers) · **app DB** (operational state, consent flags, aggregate caches). Rules: brand gets aggregates only (min cohort 5); value lands before questions; every question shows its "why"; member transparency screen ("what my panda knows" - view/edit/delete); one Ask-the-Room question per event.

## 9. Technical research digest (verified from docs + repos)

**0G Galileo testnet:** chain ID **16602**, RPC `https://evmrpc-testnet.0g.ai`, explorer `chainscan-galileo.0g.ai`, faucets: faucet.0g.ai (0.1 0G/day) + Google Cloud faucet. Storage indexer `indexer-storage-testnet-turbo.0g.ai`. Mainnet = Aristotle, 16661. Fully EVM (Hardhat/Foundry/Solidity 0.8.2x). **Gotcha:** faucet is tiny - fund multiple relayer keys, ask 0G booth for top-ups.

**Agentic ID / ERC-7857:** rebrand of iNFT. Extends ERC-721 with encrypted metadata (`IntelligentData {dataDescription, dataHash}` arrays), TEE/ZKP-oracle re-encrypting transfers, `clone`, `authorizeUsage` (≤100/token, cleared on transfer), `delegateAccess`. Production reference: `0gfoundation/0g-agent-nft`. **Crucial scope fact: the hard oracle machinery only fires on transfer/clone - mint-only usage avoids it entirely,** and 0G's own docs/tutorial use a MockOracle for testing.

**`0gfoundation/agenticID-examples` repo (we fork example 01):** simplified `AgenticID.sol` with `iMintWithRole(to, datas, creator)` (relayer gasless mints), `setTokenURI` (OPERATOR_ROLE → dynamic art), full authorize/revoke/batch + reverse lookup, `delegateAccess`. **Pre-deployed on Galileo at `0x2700F6A3e505402C9daB154C5c6ab9cAEC98EF1F`** (spike target - mint before deploying anything). Client pattern: fields hashed with keccak into labeled IntelligentData entries. Their README: contracts "simplified for demonstration"; production uses full TEE verification - quote this for honesty. One fork addition needed: `appendIntelligentData()` (~10 lines) for post-mint growth events.

**ERC-8004 (Trustless Agents):** registries live on Galileo - Identity `0x8004A818BFB912233c491871b3d84c89A494BD9e`, Reputation `0x8004B663056A597Dffe9eCcC1965A193B7388713`. Register each agent (agent card JSON at a URL) → appears on **8004scan.io**.

**0G Compute:** "Router" path = OpenAI-compatible endpoint `https://router-api.0g.ai/v1` with `sk-` key from pc.0g.ai (wallet + small deposit; confirm hackathon credits at booth). Chat models (e.g. `zai-org/GLM-5-FP8`; check `/v1/models`) **and image generation** (`POST /v1/images/generations`, must use `response_format:"b64_json"`; async endpoint recommended). Log receipts/provider addresses as the required inference proof.

**0G Storage:** `@0gfoundation/0g-storage-ts-sdk` - `ZgFile`/data → merkle root → `indexer.upload(file, rpc, signer)`; encrypt client-side first (AES-256-GCM). Root hash doubles as the on-chain `dataHash`.

**Panda generation architecture:** generate the portrait ONCE at onboarding via Router image gen (tight style prompt + trait slots mapped from answers); country flags and patches are **deterministic SVG overlays** (never AI-generate flags - they mangle); evolution = frame/aura layers by tier, portrait constant. Fallback tripwire: procedural SVG panda from answer-hash traits.

## 10. Build snapshot

Next.js 14 + Tailwind on Vercel · Privy embedded wallets (email-only) · viem + funded relayer keys (MINTER/OPERATOR roles; users never sign/pay) · Supabase Postgres · Resend email · NFC tags carrying signed claim URLs + rotating-QR fallback page. Contracts: `ZeroInAgent.sol` (forked example + append fn) + `ZeroInPatches.sol` (ERC-1155, tokenId=eventId, editions, caps, windows). Priority order: **P0** onboarding→claim→patch→gravity→profile · **P1** matching + double-opt-in intros + debrief · **P2** issuer dashboard + polish. Spikes first (mint on pre-deployed contract; Router chat + image; Storage upload). Hard rule: whatever is green at T-3h is the demo. Full detail in `zero-in-build-plan.md`.

## 11. Demo script (beats)

NFC tag on table → judge taps → onboarding → **their panda hatches with their flag** → suggestion card on two phones → both accept → **intro message with reason + "coffee at 4"** → "who did I meet this weekend?" answered from agent memory → host dashboard: live pulse of the room (claims, first-timers, intros, Ask-the-Room) → stack slide (4 pillars + 7857 + 8004, explorer + 8004scan links) + the trust line → close: any host can run this; talking with a Lisbon hub organizer as first operator; **"Apollo Demo Day is Wednesday. The tag is ready."**

## 12. Business & BD arc (context, not build)

v0 = this weekend. v1 = the community OS for 0G: patches across all their programs (workshops, Apollo Demo Day, regional pop-ups), Patch Kits (programmed NFC tags shipped to regional hosts), HQ regional roll-ups, ambassador-candidate surfacing via gravity. v2 = white-label platform (species per community), true A2A, TEE end-to-end, transfer/clone marketplace. Model: free for members; issuers pay for patches + intelligence (SaaS); **Co/Unity sells strategy + operations on top - the tool opens the door; the service is the contract.** Next BD steps: Mario-type first operator convo (Lisbon hub), Mike D intro via Alex Bowman, Apollo Demo Day timing, then the BFP conversation with the working artifact in hand.

## 13. Open items

Confirm submission deadline · 0G booth: relayer gas top-up + Router credit path · issuer's Ask-the-Room question for the demo (ideally from the 0G team) · NFC tag type + writing app · (BD) Lisbon hub organizer walkthrough.
