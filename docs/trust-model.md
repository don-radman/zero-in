# Zero-In trust and verification model

Principle: assurance is a policy per patch type. Fraud incentive scales with the
rewards attached, so cheap events can use cheap attestation and high-value drops
demand hardware. Every patch is labeled with how it was earned.

## Attestation ladder

| Tier | Mechanism | Status |
|---|---|---|
| Time-boxed claim | Claim URL valid only inside the event window | MVP |
| Venue-attested | NFC tag at the venue, or rotating QR: HMAC(eventSecret, 45s timeslice), claim token TTL 90s | MVP (demo tags are static-URL "venue-attested-lite"; production tier uses NTAG 424 rotating auth) |
| Witnessed | Host approves the claim in person | Roadmap |
| Reciprocal peer-scan | Two members scan each other; anti-fraud is the connection mechanic itself | Roadmap |
| Hardware / proof-of-human | NTAG 424 rotating auth, World ID | Roadmap |
| Self-attested (photo backfill) | Drag-and-drop photo, EXIF time+GPS parsed client-side in the browser, photo never uploaded, file-hash dedup. Screenshots and messenger images fail naturally (EXIF stripped). Never gates rewards. | Roadmap |

## Honesty notes

- Demo NFC tags carry a static signed URL: we label this venue-attested-lite and
  say so. The production path is NTAG 424 with rotating authentication.
- Contracts derive from 0G's simplified `agenticID-examples`; the production path
  is the full `0g-agent-nft` suite with TEE/ZKP transfer verification.
