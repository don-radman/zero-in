# Zero-In - Product Requirements Document (v1 draft)

**Project:** Zero-In - the presence layer for communities, built on 0G
**Event:** ETHGlobal Lisbon 2026 · Target prize: 0G "Best AI Product on 0G" ($6k track)
**Author:** Dan Rodman (Co/Unity) + Claude · **Date:** July 25, 2026
**Status:** Draft for build - feedback welcome, but scope is locked unless a tripwire fires

---

## 1. One-liner & thesis

> **POAP made attendance collectible. Zero-In makes it count** - status you can flex, people you actually meet, and a memory that compounds - while the community team finally sees one connected graph instead of fifty disconnected guest lists.

Members get a personal AI agent (an **Agentic ID** on 0G) embodied as a custom **astronaut space panda**. Showing up at events earns **Patches** sewn onto its suit and **Gravity** toward the community's status ladder. The agent privately learns who you are and what you're looking for, then connects you with the right people in the room via double-opt-in intros. The brand gets aggregate community intelligence it has never had - never individual data.

**Strategic frame (internal):** built at 0G's sponsored hackathon, on all four pillars of 0G's stack, implementing the flow a 0G team member described to us on Friday. First-operator candidate: a Lisbon hub organizer Dan knows (BD context only - **not** a build dependency). This is BFP Area 3 delivered as working software; Co/Unity operates the program layer on top.

**Tagline:** *Zero degrees of separation.*

---

## 2. Language system (locked)

| Concept | Word | Notes |
|---|---|---|
| Product | **Zero-In** | Also the verb: "zero in at Mario's meetup" |
| The buddy / agent | **Your Panda** - an astronaut space panda | AI-generated, unique per member, country flag sticking out of its backpack |
| Per-event collectible | **Patch** | Mission-patch culture; numbered editions ("Lisbon patch #23 of 200"); designed by the issuer |
| Status metric | **Gravity** | Never "points." You gain gravity; things get pulled toward you |
| Tiers | Simple gravity levels: **Cadet → Explorer → Voyager → Legend** | Placeholder names, config-driven. Deliberately NOT wired to 0G's Discord role ladder or any external system |
| Issuer's custom question | **Ask the Room** | One per event, answers aggregate-only |
| Post-event follow-up | **Debrief** | Agent-led, next morning (demo mode: 2 min delay) |

Banned vocabulary: points, stamps, passport, NFT (say "patch" / "your panda" / "collectible"), landmark (retired).

---

## 3. Personas & value

**Member (attendee)** - four faces of value:
1. **The Flex** - unique AI-generated panda, numbered patches on the suit, gravity + tier, shareable profile card. "I was early," with receipts.
2. **The People** - the agent turns a room of strangers into up to 3 warm intros with a *reason* and a *time window*.
3. **The Memory** - "Who did I meet today?" The agent remembers everyone, where, and what they were building. A personal CRM you never maintain. Fully private.
4. *(Parked for later elaboration: gravity-linked perks and ambassador-path visibility - do not build or over-specify now.)*

**Host / ambassador (any community organizer)**:
- Creates an event in 30 seconds → gets an NFC tag / QR.
- Runs their normal meetup; the tool does attendance, onboarding, and intros silently.
- Next morning: one-screenshot recap - attendance, first-timers, intros accepted, Ask-the-Room summary, members crossing gravity thresholds (ambassador candidates).

**HQ (0G community/ecosystem team)**:
- **One graph across every event type** - hackathons, workshops, pop-ups, Grounded sessions - the same human recognized everywhere. ("This Seoul pop-up regular just showed up at the Lisbon hackathon.")
- **Regional intelligence** - attendance, repeat rate, what attendees build/need, per city.
- **Events→builders attribution** - attendee → repeat → hacker → deployed on mainnet, timestamped by patches.
- **Ask the Room** - one custom question per event, answered conversationally, reported in aggregate.
- **Ambassador pipeline** - gravity thresholds surface candidates (the "open-door discovery layer").
- **Dogfooding** - every member is a live Agentic ID generating Storage writes and Compute calls on 0G.

---

## 4. The core loop (MVP)

1. **Onboard once** (≈90 seconds, email only - no wallet knowledge needed)
   - Email → embedded wallet spins up invisibly (Privy) → relayer mints Agentic ID.
   - Questions: ① country (→ flag in backpack) ② "What are you building / into?" (tags + one free-text line) ③ "What are you looking for?" ④ connection consent (this event / community-wide / off).
   - Optional: social handles (X, GitHub, Farcaster, LinkedIn) - plain text fields, no OAuth in MVP. Feeds matching context + panda generation.
   - **The hatch:** AI generates their unique astronaut space panda (see §7). Genesis moment on screen.
2. **Register intent** for an event: what you're looking for *here* + logistics ("When do you fly out?" / "Which side events?") + the issuer's Ask-the-Room question.
3. **Zero in at the venue:** tap the NFC tag (or scan rotating QR) → Patch mints (numbered edition) → Gravity up → intent goes live in the cohort. One optional emoji tap while the mint confirms. ≤10 seconds.
4. **The agent hunts:** matching runs on 0G Compute across the *consenting* cohort - interests × complementarity × shared logistics. Suggestion cards (up to 3): person, reason, shared window. Both tap yes →
   **The intro message:** *"Maria's panda thought you two should connect - you're both building agent-payment rails, and you both fly out Monday. Coffee at the venue café around 4?"*
5. **The debrief** (next morning; demo mode = 2 min): agent-led 3-question conversation - what stuck, did you meet anyone you'll follow up with, one thing to change. Completing it upgrades the patch to its finished form and unlocks further intros.
6. **Issuer view:** aggregates only - attendance, first-timers, intros created/accepted, Ask-the-Room summary, gravity movements. Never individual answers.

---

## 5. Why this must be an Agentic ID (ERC-7857 + ERC-8004)

The test for each primitive: *what breaks if you remove it.*

| Primitive | Product function | What breaks without it |
|---|---|---|
| Encrypted intelligent data | Agent memory: goals, logistics, people met | Public metadata doxxes members; a private DB makes *us* the data owner - the thing we claim not to be |
| On-chain hash per entry (`IntelligentData[]`) | Every patch/intent/debrief commits a hash - growth is provable, unreadable | Gravity becomes app points: unverifiable, unportable |
| `authorizeUsage` (usage ≠ ownership) | Member grants the matcher revocable on-chain permission to *run* their agent | Consent degrades to a ToS checkbox |
| `iTransferFrom`/`clone` w/ TEE re-encryption | The learned agent is a portable *asset* | "Own your network" becomes a slogan (roadmap-tier for MVP; stated honestly) |
| ERC-8004 registration | Agents discoverable on 8004scan; other agents can find yours cross-app | Agent-to-agent stays an internal feature of one app |

**The line (use verbatim in README/demo):** "We don't ask members to trust Zero-In with their data - the token standard makes it impossible for Zero-In to have it."

**Honesty rule:** MVP matching runs centrally on 0G Compute over agents that granted `authorizeUsage` - semantically agent-to-agent, mechanically one matcher. True peer A2A negotiation via ERC-8004 discovery is roadmap. Say it exactly this way.

---

## 6. Feature specs (MVP)

### 6.1 Onboarding
- Screens: email → verify (Privy) → Q&A (4 questions + optional socials) → panda generation (loading = "your panda is suiting up…") → hatch reveal → profile.
- Consent is granular and changeable; default = "this event only."
- Every question carries one-line microcopy: *"→ helps your panda find your people."*

### 6.2 Events & Patches
- Issuer dashboard: create event (name, date/window, venue, cap, patch artwork upload or auto-generated, Ask-the-Room question, attestation tier). Output: claim URL → NFC tag write + rotating-QR fallback page.
- Patch = ERC-1155 tokenId per event; edition number assigned at claim (#N of cap); trust tier stored (`venue` for MVP; `self` reserved for photo backfill roadmap).
- Claim rules: one per wallet per event; only during window; token-signed URL (see build plan §NFC).

### 6.3 Gravity & tiers
- Earned: patch claim **+20** (official/flagship event **+30**) · accepted intro **+10** (each side) · completed debrief **+10** · intent registered **+2**.
- Anti-farm: patches unique per event; intro gravity unique per pair; no repeatable actions.
- Tiers (config-driven, keep simple): Cadet 0 · Explorer 50 · Voyager 150 · Legend 400. Placeholder names - no external-ladder mapping.
- Tier-up = visible panda/card upgrade. Nothing else hangs off tiers in MVP.

### 6.4 Matching & intros
- Trigger: on each claim + batch after event start.
- Inputs: cohort members with consent ∩ live patch; profile + intent + logistics.
- Compute: 0G Compute Router (LLM prompt over candidate pairs; output = top matches with reason strings). Store as suggestion cards, max 3 active per member per event, 24h expiry.
- Double opt-in: both accept → intro message generated (0G Compute) with name-attribution to the *initiating agent* + suggested time/place from shared logistics; delivered in-app + email.
- Non-response: card expires silently; "your panda keeps looking."

### 6.5 Ask the Room + issuer aggregates
- One question per event, asked during intent registration or claim.
- Individual answers → encrypted into the member's agent memory only.
- Aggregate synthesis (0G Compute) → issuer dashboard: themes, counts, notable asks. Minimum cohort of 5 before any aggregate is shown (small-n privacy guard).

### 6.6 The Debrief
- Fires next morning (config: `DEBRIEF_DELAY`; demo = 2 min). Email with magic link → 3-question conversational exchange with the panda.
- Completion: patch upgrades to "finished" art state (gold ring), +10 gravity, unlocks next intro batch.

### 6.7 "What my panda knows"
- Transparency screen: every stored fact, editable/deletable. Cheap to build, disproportionate trust payoff. Include in demo.

### 6.8 Profile & share card
- Panda portrait + flag + patched suit frame + gravity/tier + patch shelf.
- One-tap share image (OG-image route) for X: "Space Cadet → Pioneer · 3 patches · ETHGlobal Lisbon."

---

## 7. Panda visual system (AI-generated + deterministic layers)

**Requirement:** every panda unique, generated from onboarding answers + socials; country flag sticking out of the backpack; patches visibly accumulate; evolves with gravity. Must be feasible solo in <1 day.

**Architecture: generate once, layer forever.**
1. **Base portrait (AI, once at onboarding):** image generation on **0G Compute Router** (`POST /v1/images/generations`, `b64_json`). Tight prompt template for style consistency:
   *"Cute astronaut panda character, flat vector sticker style, centered, facing forward, full body, white background, wearing a space suit with a small backpack, [TRAIT SLOTS]"*
   Trait slots mapped from answers: interests → accessory (builder → utility belt; DeFi → holo-visor; artist → paint-splash suit accents; researcher → data-pad…), free-text vibe → one adjective, palette from a color pick. Store the seed/prompt + resulting image (0G Storage + cache).
2. **Deterministic overlays (SVG, composed server-side at `tokenURI` render):** country flag on backpack anchor (SVG flag set - never AI-generate flags, they mangle), patch row/frame around the card (each event's patch art), gravity aura + tier frame, debrief gold-rings.
3. **Evolution = frame/aura changes by tier**, portrait constant (consistency + zero regeneration cost).
4. **Fallback (tripwire):** if Router image gen is flaky/slow Saturday evening → procedural SVG panda (layered traits from answer hash). Same trait mapping, still unique, demo-safe. Decision owner: Dan, Sat 19:00.

---

## 8. Data & privacy model

Three rings:
- **Ring 1 - public on-chain:** wallet, Agentic ID token, IntelligentData *hashes*, patch tokens + editions, 8004 registration. (Pseudonymous - email↔wallet mapping never on-chain.)
- **Ring 2 - encrypted agent memory (0G Storage, root hash on-chain):** profile answers, intents, logistics, people met, debrief answers, Ask-the-Room individual answers.
- **Ring 3 - app DB (operational):** email↔wallet map, sessions, events, suggestion states, consent flags, aggregate caches.

Rules: brand sees aggregates only (min cohort 5) · value lands before questions are asked · every question shows its "why" · member can view/edit/delete everything (§6.7) · one Ask-the-Room question per event, rationed.

---

## 9. Demo script (≈3 min video + live)

1. **Cold open:** NFC tag on the table. "I stuck a landmark - sorry, a *patch station* on this table. Tap it." Judge taps → onboarding → **their panda hatches with their country's flag**. (≈40s)
2. Second phone (Dan's, seeded): suggestion card appears → both accept → **the intro message lands on both screens**, with reason + "coffee at 4." (≈40s)
3. "Who did I meet this weekend?" → panda answers from memory. (≈20s)
4. Cut to **the host dashboard**: live pulse of this exact room - claims, first-timers, intros created, Ask-the-Room summary, one member tiering up to Explorer. (≈40s)
5. Stack slide: all four 0G pillars + ERC-7857 + ERC-8004, explorer + 8004scan links live. The trust line. (≈20s)
6. **Close:** "Any host can run this at their next meetup - we're already talking with a Lisbon hub organizer about being the first. Apollo Demo Day is Wednesday. The tag is ready." (≈20s)

---

## 10. Roadmap (slides, not build)

- **v0.5:** photo backfill (client-side EXIF, self-attested tier) · calendar free/busy windows · perks concept (to be elaborated later) · city Crests.
- **v1 - the 0G community OS:** patches across all 0G programs; ambassador tiers read patch/gravity history; Landmark - *Patch Kits* shipped to regional captains; HQ regional dashboards; Discord role sync.
- **v2 - the platform:** white-label species per community; true A2A negotiation via ERC-8004; TEE end-to-end matching; agent transfer/clone marketplace; Voyager ID reputation integration.
- **Business:** free for members; issuers pay for patches + intelligence (SaaS); Co/Unity sells strategy + operations on top. The tool opens the door; the service is the contract.

## 11. Open items (owner: Dan)

- [ ] Confirm **submission deadline** + judging schedule (adjust build plan §schedule).
- [ ] 0G booth: testnet token top-up for relayer + confirm Compute Router credits/deposit path (pc.0g.ai).
- [ ] (BD, not build) Lisbon hub organizer: short walkthrough for first-operator interest + maybe an Ask-the-Room question.
- [ ] 0G team: the Ask-the-Room question they'd ask this hackathon (from Friday's contact).
- [ ] NFC tags: confirm type (NTAG21x?) + writing app on phone.
