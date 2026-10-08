# Recommendation: Pixel Proofreader for Aseprite

**Status:** waiting for the owner's approval. Nothing has been built, listed or published.
**Date:** 2026-10-08. Evidence and sources are in [`market-matrix.md`](market-matrix.md). Tags: **[V]** verified, **[A]** assumption, **[U]** unknown.

---

## 1. Product hypothesis

> Indie game developers who draw their own sprites in Aseprite will pay about **$6** for an extension that runs inside Aseprite and **never changes their art**. It flags common technical pixel-art mistakes (orphan pixels, doubles, jaggies, banding, off-palette colors and accidental partial alpha) on a separate marker layer that can be removed, and explains each one in plain language. Today they catch these mistakes by eye, by asking for critique, or by exporting to a separate browser tool.

Working title: **Pixel Proofreader** (the name has not been checked; see [U] in the matrix).

### Why this one
1. **Paid demand in the category is proven [V].** Of 290 Aseprite-tagged tools on itch.io, many paid extensions sell at $3.49–$10, and several sellers keep releasing paid extensions.
2. **The gap is specific [V].** No checker that runs inside Aseprite and leaves the art alone was found. Existing options either change pixels (Adopt Pixels, Retro Diffusion PixFix), run outside the editor (SpriteLint, a browser tool), or are fragile free scripts from 2021.
3. **It is cheap and safe to build.** Pure Lua, no server, no ongoing costs, no payment integration of our own (itch.io handles checkout). The core algorithms are deterministic and can be tested with fixtures.
4. **It fits the planned pipeline.** One cross-platform `.aseprite-extension` file → GitHub Actions artifact → approved `butler push`.

### Honest weaknesses
- The total market is small and prices are low, so this is a **small first product**. Its value is proving the whole build, test and release pipeline on a real paid item, not a large revenue opportunity. No revenue forecast is made.
- There is a direct competitor (SpriteLint, $4.99 list, released recently with no ratings yet), and new look-alike tools appear quickly.
- Pixel-art "rules" are partly matters of style. If the tool raises too many false alarms, artists will reject it.

---

## 2. Specific buyer

| | |
|---|---|
| **Primary** | A solo or small-team indie game developer who draws their own game sprites in Aseprite (intermediate skill, not a professional pixel artist). They want their art to look clean without paying for a critique or waiting for one. |
| **Secondary** | Asset-pack sellers on itch.io who want a quality check before shipping a pack. This is the audience SpriteLint targets. |
| **Not targeting** | Professional pixel artists, who break rules on purpose, and non-Aseprite users (Pixelorama, LibreSprite, Photoshop). These can be revisited later. |

[A] We assume the primary buyer already owns Aseprite ($19.99 [V]) and installs extensions. The interviews need to confirm this.

---

## 3. Minimum shippable feature set (MVP)

**Included**
1. **Six checks**, each of which can be turned on or off, with a sensitivity setting where it makes sense:
   - *Orphan pixels*: an opaque pixel with no 8-connected neighbor of the same color.
   - *Doubles / L-corners*: in a 1-px line, a pixel that can be removed without breaking 8-connectivity.
   - *Jaggies*: uneven step lengths along a 1-px line (for example 1-3-1), using the step-length rule [V].
   - *Banding*: neighboring runs of different colors whose endpoints line up on the same axis, using the TU Delft definition [V].
   - *Off-palette colors*: in RGB mode, pixels not in the sprite's palette, plus near-duplicate palette colors.
   - *Partial alpha*: pixels with 0 < alpha < 255, for art meant to have hard edges.
2. **A marker layer that never changes the art:** a separate, locked layer with a different color per check. One command removes it.
3. **Scope options:** current cel, selection, current frame (all layers) or all frames.
4. **Results dialog:** counts per check, a short explanation of each rule with an "intentional? turn this off" hint, and an option to step through issues one by one.
5. **Color modes:** RGB and Indexed. Grayscale is optional.
6. **Documentation:** README, an illustrated rule guide with before/after fixtures, and an example `.aseprite` file.

**Excluded from the MVP** (candidates for later): automatic fixes, a CLI or batch mode (`aseprite -b --script`), pillow-shading detection, tilemap-specific checks, AI features, localization, integer-scale store-asset export.

**Prototype milestone** (inside the MVP budget): the pure-Lua core, three checks (orphans, doubles, partial alpha), the marker layer, and CI tests. Owner testers use this build for the go/no-go decision.

---

## 4. Launch price hypothesis

| Item | Value |
|---|---|
| Paid build | **$6 USD**, with buyers able to pay more (itch.io minimum price) |
| Free Lite build (decision for the owner) | Orphans and doubles only, as a way to bring in paid buyers. It would be published only after separate approval. |
| Comparable prices [V] | Aseprite extensions mostly cost $3.49–$5 (single feature) and up to $10 (multi-tool). SpriteLint costs $4.99. |
| Reasoning | Six checks plus running inside the editor is more than single-feature $3.75–$5 tools offer, while staying well under $10. |
| Net per sale (fee math, not a forecast) [V] | $6.00 − $0.60 (10% itch share) − $0.30 − $0.17 (processor) ≈ **$4.93** before any taxes outside the EU-VAT handling. |

Interviews test the price (section 5). Price changes need the owner's approval, as the brief requires.

---

## 5. Validation plan

| Step | What | Who | Effort | Output |
|---|---|---|---|---|
| V0 | Desk research | Claude | Done | This document and the matrix |
| V1 | Problem interviews, 8–12 people from compliant channels ([`validation-outreach.md`](validation-outreach.md)) | **The owner** sends every message; Claude does not | About 2 weeks of the owner's time, 0 credits | Anonymized interview notes (P01…P12) and a synthesis table |
| V2 | Prototype test: 3 checks, run by 5 or more interviewees on their own sprites | Owner hands out the build privately (no public listing) | About 1 week | False-positive rate, "would you keep it installed?" answers |
| V3 | Launch probe after separate approval: paid listing (plus Lite if approved) | Owner approves the listing, price and butler push | 30 days of observation | itch.io analytics: views, downloads, purchases, comments |

### Stop / go criteria

| Gate | GO if … | STOP or PIVOT if … |
|---|---|---|
| **After V1** (decides whether to build) | At least 5 of 10 people interviewed (a) use Aseprite for game sprites, (b) describe a *specific recent occasion* when they found or were told about one of these mistakes, and (c) at least 3 of them say they would buy a tool like this at $5 or more *without being prompted with the idea first*. | Fewer than 3 describe a recent occasion, or most say "I just eyeball it, it's fine". Fall back to the next-ranked option (E, or a different Aseprite workflow pain the interviews uncover). |
| **After V2** (decides whether to finish the MVP) | Median tester rates at least 70% of flagged issues as "useful" on their own art, **and** at least 3 testers say they would keep it installed. | False positives dominate even after tuning, which would mean the rules are too stylistic. Stop, or reduce scope to the Lite build as a free portfolio piece. |
| **After V3** (decides whether to keep investing) | Thresholds set **before launch** by the owner (for example a minimum number of paid sales and a page-view-to-purchase rate over 30 days). They are deliberately not filled in here because there is no data to base them on. | Below the thresholds: freeze features and spend no further credits. |

---

## 6. Minimal deployment architecture

```
repo (Deniscoke/TESTT)
├── src/core/           pure Lua 5.4, no Aseprite API: grid model + 6 detectors
├── src/aseprite/       glue: Dialog UI, reading cels into the core grid, marker layer
├── package.json        Aseprite extension manifest
├── tests/              fixtures as ASCII-art grids + expected issue lists
├── examples/           sample .aseprite files and screenshots for docs
├── docs/               rule guide, install guide, changelog
└── .github/workflows/
    ├── verify.yml      (existing) + lint (luacheck) + unit tests (lua5.4) + build zip
    └── release.yml     manual dispatch only; environment "itch-release" needs
                        approval; reads BUTLER_API_KEY from secrets; never echoes it
```

**Build pipeline:** `lua tests/run.lua` → deterministic ZIP (sorted file list, fixed timestamps, `zip -X`) → `pixel-proofreader-<version>.aseprite-extension` → uploaded as a GitHub Actions artifact. Running the same commit twice should give a byte-identical file, and a CI check compares the SHA-256.

**Release pipeline:** only after separate approval of the product, the channel and the credentials. A manually triggered job with an environment approval gate runs `butler push dist/ deniscoke/pixel-proofreader:extension --userversion-file VERSION`, adding `--dry-run` on the first run. The channel name contains no `win`/`linux`/`mac`, because the file works on every platform; platform tags are set by hand on itch [V].

**Runtime cost:** $0. No servers, databases, domains or paid services.

**Testing limits:** Aseprite is **not** run in CI because of EULA uncertainty [V/U]. The editor integration is tested by hand by the owner with a licensed copy, following a written checklist in `docs/`.

---

## 7. Estimated credit consumption

These are estimates [A]. Cloud Session metering is not visible from inside a session, so the owner should check the Claude UI after each session and stop if a phase runs over its cap.

| Phase (README cap) | Work | Estimate |
|---|---|---|
| Discovery ($25) | This research session | Check in the UI (expected to be well under the cap) |
| Prototype ($65) | Core grid model, 3 detectors, fixture tests, CI, marker layer, minimal dialog | **$25–$45** |
| MVP ($90) | 3 more detectors (jaggies, banding, palette), full dialog, all-frames scope, docs, examples, deterministic packaging | **$40–$70** |
| QA / listing ($45) | Manual QA checklist fixes, draft listing copy and screenshots (not published), gated release workflow | **$15–$30** |
| Reserve ($25) | Bug fixes after tester feedback | Use only if needed |
| **Total** | | **$80–$145 plus discovery, within the $250 budget** |

GitHub Actions minutes are billed by GitHub, not from Claude credits (README). [A] The free-plan minute allowance is enough for a Lua test suite; confirm it on the GitHub billing page if the repo stays private.

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Too many false positives or arguments about style | Every check can be turned off and tuned. The tool reports and never changes pixels. The V2 gate measures this before full investment. |
| SpriteLint or another tool adds an Aseprite integration | Compete on running inside the editor, jaggy and double detection, documentation quality and tests. Ship quickly after a GO decision. |
| Aseprite API or version changes | Declare a minimum version. Keep the core separate from the API so only the glue code is exposed. |
| Legal questions about selling extensions | Selling them is common practice [V], but there is no explicit statement [U]. The owner can ask Aseprite support before launch. |
| Small market, low price | Treat this as the first product that proves the pipeline. Keep scope fixed and spend no credits beyond what the stop/go gates allow. |

---

## 9. Decision requested from the owner

1. **Approve or reject** Pixel Proofreader as the Phase 2 product.
2. **Approve or adjust** the $6 price hypothesis and whether there should be a free Lite build.
3. **Confirm** that you will run the V1 interviews yourself using `validation-outreach.md`. Alternatively, approve building the prototype in parallel and accept the risk of building before validation.
4. itch.io account, channel and butler credentials are **not** requested yet. They are only needed at the release step.
