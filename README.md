# Cloud Lab

Independent digital-product lab using a **$250 Claude Cloud Sessions credit budget**. Separate from StarNet and existing paid Claude subscription workflows.

## Goal
Validate, build, package, and sell a small global digital product. Prefer products with reproducible CLI distribution and minimal recurring costs.

## Safety rules
- No work in StarNet repositories; only this repo.
- Never store API keys, tokens, customer data or paid product binaries in Git.
- The `main` branch is the source of truth. Run CI before releasing.
- Publishing, product-page creation, pricing changes, and payment activation require explicit human approval.
- Research market demand before spending most credits on implementation.
- Never assume a GitHub Actions run consumes Claude Cloud Session credits: billing is service-specific.

## Planned release workflow
`product source -> tests -> artifact -> GitHub release -> approved itch.io push via butler`

GitHub Releases is for versioned artifacts, not the checkout/payment storefront.

## First steps
1. Read [Cloud Session brief](docs/CLOUD_SESSION_BRIEF.md).
2. Complete market validation and select a product.
3. Implement deterministic build and tests.
4. Add manual release and separately approved itch.io deployment. Do not put secrets in PR builds.

## Budget
$25 discovery, $65 prototype, $90 MVP, $45 QA/listing, $25 reserve. These are caps, not targets.
