# Mission 003 · M1: commercial feasibility and architecture

Date: 2026-10-08. Tags: **[V]** verified on the linked source today, **[A]** assumption, **[U]** unknown.
Status: **M1 complete. Implementation is paused on two owner decisions (§5).**

## 1. Repository state (verified)
- Branch `claude/digital-product-research-khriom` at `2ed1499`. Working tree clean.
- Existing implementations kept: Lua core and Aseprite glue (56 tests), and the LibreSprite JS port `src/libresprite/core.js` (10 tests, with parity checked against Lua on 27 fixtures and 300 random grids).
- **The repository is PUBLIC** [V] (`visibility: public` on the GitHub API). This drives §5.

## 2. Competitor differentiation

### What the direct competitor offers
SpriteLint (Template Foundry), [itch.io page](https://mtw1man2.itch.io/spritelint-catch-pixel-art-mistakes-before-you-ship-browser-tool), checked 2026-10-08 [V]:
- **Price and platform:** $4.99 list (on sale for $3.34). It is an offline browser tool.
- **Checks listed:** stray pixels, outline gaps, transparent pinholes, banding, palette outliers. Sensitivity and alpha cutoff are adjustable, and there is an option to "ignore intentional issues".
- **Modes and output:** Sprite, Icon, Tileset and UI modes. Exports annotated PNG, JSON and CSV. You can click findings in the image.
- **Not stated on its page:** batch processing of multiple files, per-rule toggles, zoom or pan, side-by-side view, line-quality checks (jaggies or doubles), palette consistency across files, and HTML reports.
- **Traction:** no ratings and no comments.

Other tools found [V]:
- **PaletteCheck** (Jared York): a free HTML5 palette tool. Its page doesn't say which checks it runs.
- **Adopt Pixels**: a free Aseprite extension that fixes orphan pixels. It changes the art.
- **Retro Diffusion PixFix**: $65, AI-based, and also changes the art (see `research/market-matrix.md`).

### Differences that could justify Pro
Each difference is measured against what SpriteLint's own page states. "Not stated" does not mean the feature is missing.
1. **Line-quality checks.** Doubled corners (already built and tested) and jaggies (uneven stair-step lengths) are not listed by SpriteLint.
2. **Batch analysis with a pack-level summary,** including **palette consistency across files** (colors that drift between sprites in one asset pack). SpriteLint does not state either.
3. **A self-contained HTML report plus CSV per batch, with per-rule toggles.** SpriteLint doesn't mention HTML reports or per-rule toggles.
4. **A Free tier that is useful on its own.** It would offer 3 checks with a visual overlay, zoom and pan, entirely in the browser. SpriteLint appears paid-only (its free download holds sample reports only, and the page is ambiguous).

Overlaps, which are not differences:
- Stray pixels versus our orphan pixels.
- Banding, palette outliers, and annotated PNG and CSV export.
- SpriteLint also has two checks we don't plan: outline gaps and transparent pinholes.

### Price verdict
The differences are **real but modest**, and most of them are workflow features that matter mainly to **asset-pack creators and small studios**. The only price reference is SpriteLint at $4.99, and comparable multi-feature itch tools sit at $10–$15 (`market-matrix.md`). **There is no evidence that buyers will pay $15** (no interviews have been run yet, see `research/validation-outreach.md`).

**Recommendation:** launch Pro at **$9** and treat $15 as a later test, only after asset-pack creators confirm that batch and pack-palette reports matter to them. Building Pro is still justified, because the price can be changed at publication without touching the code.

## 3. Choosing the technology

| Option | Size / dependencies | Windows experience | Reproducible CI build | Verdict |
|---|---|---|---|---|
| Electron | Runtime about 80–100 MB, plus npm toolchain (electron, electron-builder) [A] | Unsigned `.exe`: SmartScreen warns about unrecognised apps, and code signing costs money [A] | Yes, on windows-latest | Rejected for v1: heavy, with signing cost or warnings for the user |
| Tauri | Rust toolchain plus WebView2. Small binary [A] | Same unsigned-binary warning [A] | Yes, but slower builds and more toolchain to maintain | Rejected for v1 |
| **Local-first offline web package** | **No runtime dependencies.** One self-contained HTML file of about 100–200 KB | Opens in **Microsoft Edge**, which ships with Windows 10/11. An optional `.cmd` launcher opens it in Edge's app-window mode (`msedge --app=...`). No installer and no binary to sign | Yes. Plain Node build script, tested on a **real windows-latest runner with Edge** (installed on the Windows 2025 runner image [V], [runner README](https://github.com/actions/runner-images/blob/main/images/windows/Windows2025-Readme.md)) | **Chosen** |

Architecture (one shared vanilla-JS codebase, no framework, no server):
- **PNG decoding** is our own code: inflate via `DecompressionStream` in the browser and `zlib` in Node. This keeps pixel values exact. Reading pixels through a canvas can change colors through color management and premultiplied alpha.
- **Detectors:**
  - Free: reuses `src/libresprite/core.js` unchanged (orphan pixels, doubled corners, partial alpha).
  - Pro only: jaggies, banding, near-duplicate colors, colors outside a reference palette, and cross-file palette drift.
- **Builds:** the build script assembles two separate bundles. The **Free bundle doesn't contain the Pro modules at all**, and a test checks this.
- **Exports (Pro):** annotated PNG from our own encoder, so the output is deterministic and testable, plus CSV and a self-contained HTML report. Exports are offered as downloads and never written over the source files.
- **Tests:**
  - Node unit, regression and parity tests (against the Lua reference).
  - PNG decode and malformed-file tests, plus a test on a large image.
  - Playwright end-to-end tests on Linux Chromium and on **Windows Edge**, opening the app from `file://` with no network. They check results and exports, and that the input files' hashes are unchanged.

## 4. Packaging and distribution feasibility
- **Technical:** feasible. The Edge-based package can be built and tested on GitHub's Windows runners for free on a public repo.
- **Release gate:** environments with **required reviewers** are available on **GitHub Free only for public repositories**. Private repos need GitHub Pro or Team, and on Free, switching a repo to private disables existing environment protection rules [V] ([GitHub docs](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)).
- **CI artifacts** can be downloaded by anyone with read access to the repository [V]. For a public repo that means the public (GitHub sign-in may be required [A]).

## 5. Blocker: Pro cannot be kept private in this public repository
If Pro source code or Pro build artifacts are committed or uploaded here, **anyone can download or rebuild the paid edition**. The brief forbids making a public Pro build accessible without explicit authorization, and committing the Pro source to a public repo has the same effect. **No Pro code has been written or committed.**

Options for the owner:

| Option | What protects Pro | Release gate | Cost | Notes |
|---|---|---|---|---|
| **A. Split repos (recommended)** | Free edition plus shared detectors stay in public `TESTT`. **Pro code goes in a new private repo** that the owner creates and attaches to the session | Public repo: environment with required reviewers (free). Private Pro repo on Free plan: a manually dispatched workflow plus an "enabled" repository variable, with only the owner able to dispatch | $0 | Cleanest. Free stays open, Pro stays closed |
| B. Make `TESTT` private | Everything private | Environments with reviewers **not available** on GitHub Free for private repos. Use the same manual-dispatch gate, or GitHub Pro (paid) | $0, or GitHub Pro | Code already pushed may have been cloned while public. Changing visibility is a security setting I won't change myself |
| C. Keep public, source-available Pro | A license forbidding redistribution only. Anyone can still build it | Environment with reviewers | $0 | Not recommended: buyers pay only for convenience |

## 6. Plan once the owner decides
- **M2:** the Free web edition in the public repo. This can go ahead under any option.
- **M3:** Pro in its protected location, with Windows Edge end-to-end tests.
- **M4:** listing materials, a release workflow that is **disabled by default** (`workflow_dispatch` only, a repository-variable kill switch, `BUTLER_API_KEY` stored only as a secret, no butler step runs until enabled), and the QA checklist.
- **Estimated credits** for M2–M4 [A]: about $30–$45, within the $50 cap. The owner should check actual usage.

## 7. Owner decisions (2026-10-08)
- **Option A, split repos:** the Free edition and shared code stay in public `Deniscoke/TESTT`. Pro code lives in a **private repo that the owner creates and attaches to the session**. No Pro code is written until that repo exists.
- **Launch price: $9** for Pro. Listing materials use $9, and $15 stays a later test.
