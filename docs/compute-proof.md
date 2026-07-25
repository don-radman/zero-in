# Proof of 0G Compute usage

Submission requirement for the 0G track: every inference and image generation in
Zero-In runs on the 0G Compute Router (`https://router-api.0g.ai/v1`). This file
collects receipts. Rows are appended by `scripts/spike-compute.ts` and by the app's
compute wrapper (`src/lib/compute.ts`).

What runs on 0G Compute:
- Panda portrait generation at onboarding (`/v1/images/generations`)
- Match reasoning per candidate pair (chat completion)
- Intro message generation on double opt-in (chat completion)
- Debrief conversation turns (chat completion)
- Ask-the-Room aggregate synthesis (chat completion)

## Receipts

| Timestamp (UTC) | Kind | Model | Request ID | Provider | Note |
|---|---|---|---|---|---|
