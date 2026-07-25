# Morning runbook (Saturday)

State as of the overnight build: the ENTIRE code surface for P0 + P1 is written,
building, and pushed. 8 contract tests pass. The migration runs green on
Postgres 17. Every flow degrades gracefully until its key exists, so the app
runs end to end in dev mode right now. What remains is keys, spikes, deploy,
and seeding real humans.

## 1. Accounts + keys (do these at the venue, ~30 min)

| Key | Where | Notes |
|---|---|---|
| RELAYER_KEYS (3-4) | https://faucet.0g.ai + Google Cloud 0G faucet | Generate keys: `node -e "const {generatePrivateKey}=require('viem/accounts');for(let i=0;i<4;i++)console.log(generatePrivateKey())"`. Fund EVERY one from BOTH faucets. Ask the 0G booth for a top-up. |
| ROUTER_API_KEY | https://pc.0g.ai | Needs wallet + small deposit. Ask booth about hackathon credits. |
| NEXT_PUBLIC_PRIVY_APP_ID + PRIVY_APP_SECRET | https://dashboard.privy.io | New app, email login, embedded wallets ON, add localhost:3000 + the Vercel domain. |
| SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY | see blocker below | |
| RESEND_KEY | https://resend.com | Optional for demo (emails are secondary surface). |
| STORAGE_MASTER_KEY, CLAIM_HMAC_SECRET | generate locally | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` twice. |

**Supabase: DONE (Sat morning).** Project `zero-in` (ref xvwgskevjcldaajcvrzg,
eu-west-3) is live with the migration applied: 7 tables, RLS on. Remaining:
dashboard -> Project Settings -> API Keys -> copy the service_role (secret) key
into SUPABASE_SERVICE_ROLE_KEY in .env. URL is already filled in.

**.env: GENERATED (Sat morning)** via `scripts/gen-env.ts`: 4 relayer keys +
both random secrets + Supabase URL. Check funding progress any time with
`npx tsx scripts/relayers.ts` (prints addresses + live balances).

## 2. Spikes (all three green before anything else)

```bash
npx tsx scripts/spike-mint.ts      # 7857 mint on 0G's pre-deployed contract
npx tsx scripts/spike-compute.ts   # chat + image via Router; starts docs/compute-proof.md
npx tsx scripts/spike-storage.ts   # encrypt -> upload -> download round-trip
```

spike-compute exit code 2 = chat green but image gen failed. The procedural SVG
panda fallback is ALREADY armed and visually verified, so image-gen failure
costs nothing except AI portraits.

## 3. Deploy + wire

```bash
npx hardhat compile
npx tsx scripts/deploy.ts          # prints AGENT_CONTRACT + PATCHES_CONTRACT for .env
npx tsx scripts/seed-demo.ts       # 8-hacker demo cohort + first match round
npx tsx scripts/register8004.ts 0  # after Vercel deploy (agent card must be public)
```

Vercel: `vercel --prod` (or connect the repo in the dashboard), add every .env var,
set NEXT_PUBLIC_APP_URL to the deployed URL. Redeploy. Then write the NFC tags with
the claim URL that seed/event creation prints.

## 4. What is already handled (do not redo)

- Gasless consent: ZeroDev has no 0G support; `authorizeUsageWithSig` (EIP-712)
  in ZeroInAgent covers it. Tested.
- Image-gen tripwire: procedural pandas ship by default until ROUTER_API_KEY exists.
- Pre-deploy mode: onboard/claim work DB-only (token_id null, backfill later).
- Matching pre-keys: transparent heuristic; flips to Router LLM automatically.
- Dev auth: without Privy keys the app uses a dev email prompt (DEV_FAKE_AUTH=1
  server-side). Never set that flag in production.

## 5. Saturday evening goals (per build plan)

Onboard 10-20 real hackers at the venue, write 2 NFC tags, run a match round
from the host dashboard, confirm intros land on two phones. Sunday morning:
demo video + submission checklist in `zero-in-build-plan.md` section 8.
