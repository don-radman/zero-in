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
| 2026-07-25T15:19:13.207Z | models | - | - | - | 23 models: 0gm-1.0-35b-a3b, 0gm-1.0-35b-a3b-sia, claude-fable-5, claude-opus-4-8, claude-sonnet-5, deepseek-v4-flash... |
| 2026-07-25T15:27:46.025Z | models | - | - | - | 2 models: qwen-image-edit, qwen2.5-omni... |
| 2026-07-25T15:27:47.400Z | chat | qwen2.5-omni | chatcmpl-428ab08e-ca63-4575-b620-0525b901af1d | - | spike hello |
