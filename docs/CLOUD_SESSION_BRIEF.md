# Cloud Lab: first Claude Cloud Session brief

You are operating exclusively in repository `Deniscoke/TESTT`. Do not touch StarNet or any other repository. Budget ceiling: **$250 in eligible Claude Cloud Session credits**, expiring 2026-11-05 according to the account screenshot. Confirm actual session eligibility and cost in the Claude UI; do not assume runtime metering from this document.

## Mission
Choose a global digital product that can be built with low operational costs, packaged locally and distributed via a reproducible CLI/API pipeline. The strongest channels to consider are itch.io (butler), GitHub Releases, and npm (only for a compatible developer tool).

## Phase 1 — Research first (no implementation yet)
Compare 3–5 sharply scoped products in categories such as game developer utilities, visual web testing tools, and specialized creator utilities. Research direct competitors, documented price points, buyer pain, distribution APIs/CLI, technical feasibility, and marketing access. Clearly separate verifiable data from assumptions.

Deliver:
- `research/market-matrix.md`: competitors, source links, pricing, distribution restrictions, estimated effort, and unknowns.
- `research/recommendation.md`: one product hypothesis, specific buyer, minimum shippable feature set, launch price hypothesis, validation plan, stop/go criteria.
- `research/validation-outreach.md`: compliant, non-spammy outreach scripts and an interview plan. **Do not send messages or create public listings.**
- A minimal deployment architecture and estimated credit consumption for the proposed MVP.

Do not use fabricated customer quotes or unsupported revenue predictions. Do not build the product until the owner explicitly approves the recommendation.

## Subsequent phases (only after approval)
Build a small deterministic, tested, self-contained product. Documentation and example projects required. GitHub Actions should verify build and prepare a downloadable artifact.

Add itch.io deployment via `butler push` only after explicit approval of product, destination channel and credentials. Require GitHub Actions environment approval and keep `BUTLER_API_KEY` in GitHub Actions secrets; never echo it to logs.

## Boundaries
No release/publication or price changes without approval. No Stripe or other payment activation. No use of StarNet assets without documented permission and provenance. Do not change security settings or add paid services without explicit consent.
