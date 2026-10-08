# Market matrix: Phase 1 candidate comparison

Research date: **2026-10-08**. Scope: five narrowly defined digital products that one developer can build, package locally, and ship through itch.io (butler), GitHub Releases or npm, with no servers to run.

## How to read this document

| Tag | Meaning |
|---|---|
| **[V]** | Verified: read on the linked source on 2026-10-08. itch.io prices can be temporary sale prices. |
| **[A]** | Assumption or estimate: not verified. It needs checking before anyone relies on it. |
| **[U]** | Unknown: could not be determined in this phase. |

No customer quotes, sales figures or revenue forecasts appear here. itch.io does not publish sales counts, so the documents use these signals of paid demand instead: a paid listing's rank under "Top sellers", the number of paid competitors, and sellers who keep releasing more paid tools in the same niche.

---

## 1. Shared distribution channels (apply to every candidate)

| Channel | Verified facts | Restrictions and notes |
|---|---|---|
| **itch.io + butler** | [V] `butler push <dir> user/game:channel`. Channel names that contain `win`, `linux`, `mac` or `android` set the platform tags automatically. `--userversion` and `--dry-run` are supported. The upload limit is 30 GB uncompressed. ([pushing docs](https://itch.io/docs/butler/pushing.html)) <br>[V] In CI, butler reads the `BUTLER_API_KEY` env var. If the key shows up in a public log, revoke it at once. ([login docs](https://itch.io/docs/butler/login.html)) <br>[V] Open revenue share: the seller chooses 0–100%, and the default is 10%. PayPal and Stripe each take about $0.30 + 2.9%. itch's own worked example turns a $10 sale into $8.41. ([payments docs](https://itch.io/docs/creators/payments)) <br>[V] When itch.io collects the money ("Collected by itch.io, paid later"), it handles EU VAT automatically. ([creator FAQ](https://itch.io/docs/creators/faq)) | [V] New accounts have a soft limit of 20 project pages and 10 files per page, which itch raises on request. Tools and assets are allowed product types. <br>[A] Payout takes about 7 days to become available, then goes through a payout review. This comes from a third-party source and is not confirmed. |
| **GitHub Releases** | [V] Up to 1,000 assets per release. Each file must be under 2 GiB. There is no limit on total size or bandwidth. ([GitHub docs](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)) | It has no checkout and no licensing. Use it for versioned artifacts, a free Lite build or source releases, not as the storefront (this matches the repo README). |
| **npm** | [A] The public registry has no way to take payment or enforce licenses. A paid npm tool would need an outside license server or a SaaS backend. | Only suits a developer tool, and gives no built-in way to make money. |
| **Godot Asset Store** | [V] The store is live but listings are free only. Paid assets are planned "later", with no date published. ([Godot announcement](https://godotengine.org/article/introducing-the-godot-asset-store/), [roadmap](https://store.godotengine.org/roadmap)) | Not a paid channel today. |

---

## 2. Candidate summary

| # | Candidate | Buyer | Channel | Paid demand signal | Competitive gap | Est. build credits [A] | Verdict |
|---|---|---|---|---|---|---|---|
| **A** | **Pixel Proofreader**: an Aseprite extension that checks pixel art without changing it. It flags orphan pixels, doubles, jaggies, banding, off-palette colors and partial alpha on a separate marker layer. | Indie devs and asset-pack makers who draw their own sprites in Aseprite | itch.io (butler), plus GitHub Releases for a Lite build | Strong for the *category* | Moderate: one young direct competitor (browser-based) | $70–$125 | **Recommended** |
| B | Godot 4 localization QA plugin/CLI (missing keys, placeholder drift) | Godot devs who localize | itch.io and the Godot Asset Store (free only) | Weak | Very small: at least 3 tools appeared in 2026 | $60–$100 | Reject |
| C | Store-asset kit generator CLI (every Steam/itch capsule size from one source image) | Devs before launch | itch.io and GitHub | Weak | None: several free browser tools | $40–$70 | Reject |
| D | Visual regression testing CLI for web apps | Front-end teams | npm | Buyers pay for hosted review, not for CLIs | None: Playwright has it built in, and several OSS and SaaS tools have free tiers | $120–$200+ | Reject |
| E | CI-friendly texture atlas packer CLI (Godot/Phaser/Unity export) | Studios with build pipelines | itch.io and GitHub | Proven (TexturePacker) | Small: free OSS packers, and the incumbent is mature | $90–$150 | Hold / reject |

Credit estimates are rough figures for Claude Cloud Session work: build, tests, CI, docs and packaging. Actual metering is not visible from inside the session, so confirm it in the Claude UI.

---

## 3. Candidate details

### A. Pixel Proofreader: a non-destructive pixel-art QA extension for Aseprite (recommended)

**Evidence of paid demand (category level)**
- [V] Searching the itch.io "Aseprite" tag under Top sellers returns **290 results**. Paid extensions in the top 25 include Brush Manager Pro ($4.49), Tweencel ($3.75 on sale), Extra Layer Options ($5), The Tween Machine ($5), Color Swap ($5), Dithering Generator ($3.49), FastFX (€8.39 on sale), Aseprite MCP Pro ($10) and Retro Diffusion ($65). ([itch.io Aseprite top sellers](https://itch.io/tools/top-sellers/tag-aseprite))
- [V] Several sellers have more than one paid Aseprite extension. Devkidd has 5 in the top 25 and CarbsCode has 4. This suggests a market worth returning to, though it does not prove volume.
- [V] The "Pixel Art" tag under Tools returns **904 results**. The paid top sellers sit between $3 and $65. ([itch.io pixel-art top sellers](https://itch.io/tools/top-sellers/tag-pixel-art))
- [V] Aseprite itself is sold on itch.io for $19.99. Buyers already pay for the host app. ([listing](https://itch.io/tools/top-sellers/tag-aseprite))

**Evidence of the buyer's problem**
- [V] An Aseprite community thread from 2021 asks for a "remove/clean jaggy function" for lines that are already drawn. The built-in pixel-perfect brush only helps while drawing. Community members wrote rough Lua scripts that mark jaggies in red. Those scripts are hardcoded to one color and in some versions only work on rectangular selections. ([thread](https://community.aseprite.org/t/remove-clean-jaggy-function/11304))
- [V] A forum script suggestion asks for selecting "orphan pixels". ([thread](https://community.aseprite.org/t/script-suggestion-selecting-orphan-pixels/17138))
- [V] Pixel-art teaching material treats jaggies, uneven step lengths, banding and pillow shading as standard mistakes. A 2025 TU Delft thesis defines banding formally: "adjacent pixel segments of different colors align their endpoints along a shared axis". That definition is precise enough to implement. ([Wayline lesson](https://www.wayline.io/learn/pixel-art/1), [TU Delft repository](https://repository.tudelft.nl/file/File_65d43acd-9779-4eab-999b-9bcd4f0a96a9))
- [A] How often and how much this hurts has **not** been confirmed with real buyers. That is what the validation plan is for.

**Competitors**

| Competitor | Type | Price | Overlap | Gap | Source |
|---|---|---|---|---|---|
| SpriteLint (Template Foundry) | Offline browser tool (16 kB zip) | $4.99 list, on sale for $3.34 at check time [V] | Stray pixels, outline gaps, transparent pinholes, banding, palette outliers; exports annotated PNG/JSON/CSV [V] | Runs outside Aseprite (export, then drag in). No jaggy or double checks listed. Updated about 22 days before the check, with **no ratings** shown [V] | [itch page](https://mtw1man2.itch.io/spritelint-catch-pixel-art-mistakes-before-you-ship-browser-tool) |
| Adopt Pixels (Astropulse) | Aseprite extension | Name your own price (free) [V] | Orphan pixels | **Destructive**: it recolors pixels automatically. Orphans only. 2 ratings [V] | [itch page](https://astropulse.itch.io/adopt-pixels) |
| Retro Diffusion "PixFix Filter" | Part of a $65 AI extension | $65 [V] | Orphans, line cleanup, color repair | Destructive and AI-based. Bundled with a much larger, expensive product [V] | [itch comment by author](https://itch.io/post/13617709) |
| Community scripts ("eg_jagger", orphan selector) | Free Lua scripts in forum posts | Free [V] | Jaggies (marked in red) and orphan selection | Hardcoded colors, fragile with selections, no UI or docs, not maintained since 2021 [V] | [thread](https://community.aseprite.org/t/remove-clean-jaggy-function/11304) |
| Manual critique (r/PixelArt, Discords) | Human feedback | Free | Everything, including style | Slow and depends on someone being available [A] | [U] subreddit rules could not be fetched |

**Distribution:** [V] A `.aseprite-extension` file is a ZIP containing `package.json` plus scripts, installed through Edit > Preferences > Extensions. ([Aseprite docs](https://www.aseprite.org/docs/extensions/)) One file that works on every OS fits butler and itch well.

**Technical feasibility**
- [V] The Lua API can read pixels (`Image:getPixel`, the `Image:pixels()` iterator, `colorMode`) and create or draw images (`Image()`, `drawPixel`, `drawImage`). ([API docs](https://github.com/aseprite/api/blob/main/api/image.md))
- [A] The detectors are deterministic grid algorithms, so they can live in pure Lua with no Aseprite dependency and be unit-tested in CI with stock Lua 5.4.
- [V] Building Aseprite yourself for personal use is allowed, but redistributing builds is not. Whether running it in CI is allowed is unclear ([FAQ](https://aseprite.org/faq/), [forum](https://community.aseprite.org/t/eula-and-faq-confusion/9377)). **Plan:** do not run Aseprite in CI. Test the pure-Lua core in CI and test the editor integration by hand against the owner's licensed copy.

**Marketing access [A]:** the itch.io tag pages (aseprite, pixel-art, tools), the Aseprite community forum, pixel-art subreddits and Discords (self-promotion rules **[U]**), and devlogs on itch.io. All of these are free and organic.

**Unknowns**
- [U] Whether Aseprite's EULA or ToS says anything specific about selling extensions. Selling them is widespread in practice (Retro Diffusion at $65 and dozens of $3–$10 extensions on itch), but no explicit permission was found.
- [U] The minimum Aseprite version the extension needs (expected to be 1.3.x).
- [U] Whether artists will accept rules about style. Experienced artists break "rules" on purpose, which makes false positives a core risk.
- [U] Whether SpriteLint will grow or add an Aseprite integration.
- [U] Whether the name "Pixel Proofreader" is taken. It is a working title only.

---

### B. Godot 4 localization QA plugin/CLI

| Item | Detail |
|---|---|
| Competitors [V] | **LocGuard Lite** is a free MIT plugin on the Godot Asset Library ([asset 5378](https://godotengine.org/asset-library/asset/5378)). Its listing mentions a Pro tier with placeholder drift checks, BBCode checks and a CI gate; the Pro price is [U]. **Godot Localization QA Guard** is a Python CLI ([PyPI](https://pypi.org/project/godot-localization-qa-guard/0.1.4/)). **StringSentry** is a browser tool ([Godot forum](https://forum.godotengine.org/t/stringsentry-local-qa-for-godot-translation-csv-and-po-pot-files/142369)). All three appeared recently and cover the same checks. |
| Pricing [V/U] | No paid price for any of them could be confirmed. |
| Distribution | Godot Asset Store is free only [V]. itch.io is possible. |
| Feasibility | High. Godot runs headless for free, so CI tests are easy [A]. |
| Pain | Real but occasional (once per localization pass) [A]. |
| Why reject | Three or more look-alike tools in under a year, mostly free. No evidence of paid demand. |

### C. Steam / itch store-asset kit generator

| Item | Detail |
|---|---|
| Spec [V] | Steam requires: header capsule 920×430, small capsule 462×174, main capsule 1232×706, vertical capsule 748×896, library capsule 600×900, library header 920×430, library hero 3840×1240 (no text; 860×380 safe area), library logo 1280 wide and/or 720 tall (transparent PNG). The page background is 1438×810 and optional. ([store assets](https://partner.steamgames.com/doc/store/assets/standard), [library assets](https://partner.steamgames.com/doc/store/assets/libraryassets)) |
| Competitors [V] | **Wayline Steam Capsule Maker**: free, runs in the browser, exports every size as a ZIP ([link](https://www.wayline.io/steam-capsule-maker)). **presskit.gg resizer and templates**: free ([link](https://presskit.gg/tools/steam-image-resizer)). **Summer Engine**: AI capsule art generator, paid plan ([link](https://www.summerengine.com/steam-capsule-art-generator)). |
| Pain | Real, but it comes up once per game [A]. |
| Why reject | Free tools already solve it well. Buyers have no reason to pay. A pixel-art-specific angle (integer scaling) could be a free side feature of A later. |

### D. Visual regression testing CLI (web)

| Item | Detail |
|---|---|
| Competitors [V] | **Playwright `toHaveScreenshot()`** is built in and free (since v1.22). **BackstopJS** is OSS but looking for a maintainer. **reg-suit** is an OSS comparison and review layer. ([overview](https://bug0.com/knowledge-base/open-source-visual-regression-testing-tools)) |
| SaaS pricing [V*] | Argos: free up to 5,000 screenshots/month, Pro from $100/month. Chromatic: free up to 5,000 snapshots, Starter $179/month. Percy: 5,000 free per month ([BrowserStack docs](https://www.browserstack.com/docs/percy/overview/plans-and-billing)); its paid tiers are reported inconsistently ($199–$599/month). Lost Pixel is reported to be shutting down. *Most figures come from Argos's own blog, which is a competitor ([Argos pricing post](https://argos-ci.com/blog/visual-testing-pricing)).* |
| Distribution | npm cannot take payment [A]. Making money needs a hosted review service, which means running servers and paying ongoing costs. Both are outside this brief's limits. |
| Why reject | The free incumbents are strong, the money is in SaaS (which needs infrastructure), and cross-browser rendering stability would make the build expensive. |

### E. CI-friendly texture atlas packer CLI

| Item | Detail |
|---|---|
| Incumbent [V] | **TexturePacker** costs $49.99 one-time with 1 year of updates. A single-user license **does not cover CI, servers or Docker**, which need a separate Docker/CI license (annual subscription; price **[U]**, not shown in search results). ([store](https://www.codeandweb.com/store/texturepacker-single.md), [CI license](https://www.codeandweb.com/store/texturepacker-ci)) |
| Free alternatives [V] | **free-tex-packer-core / free-tex-packer-cli** (MIT; MaxRects; exporters for Pixi, Phaser, Godot, Spine, Unity, Cocos2d). **sheep** (Rust CLI). ([free-tex-packer-core](https://github.com/zfkun/free-tex-packer-core), [sheep](https://github.com/amethyst/sheep)) |
| Pain | The CI licensing gap is real for teams [V for the license terms, A for how much it hurts]. |
| Why hold | Paid demand is proven, but free MIT packers already cover CI. The buyers (studios) rarely shop on itch.io, and matching export formats costs a lot. A possible later niche, but not first. |

---

## 4. Scoring (1 = poor, 5 = strong)

| Criterion (weight) | A | B | C | D | E |
|---|---|---|---|---|---|
| Paid demand in category (×2) | 4 | 2 | 2 | 2 | 3 |
| Competitive gap (×2) | 3 | 1 | 1 | 1 | 2 |
| Build cost fits budget | 5 | 4 | 5 | 2 | 3 |
| Testable and deterministic | 4 | 5 | 5 | 3 | 5 |
| Distribution fit (butler/itch) | 5 | 3 | 3 | 1 | 3 |
| Marketing access (organic) | 3 | 3 | 3 | 2 | 2 |
| **Weighted total (max 40)** | **31** | **21** | **22** | **14** | **23** |

Scores are judgement calls based on the verified facts above. They rank the options; they do not predict revenue.

## 5. Notes across all candidates

- [V] Several recent listings in these niches (localization QA, sprite linting, MCP bridges) look quickly produced, often with no ratings. Simple "QA checker" niches fill up fast. Whatever we build has to win on *workflow integration* (inside the tool the buyer already uses), output quality and a low false-positive rate, not on simply existing.
- [A] On itch.io, buyers of tools pay for visible time saved on art: converters, generators and editor extensions. They pay much less for devops and QA utilities that have free OSS equivalents.
