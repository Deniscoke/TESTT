# Release process and owner setup

Pipeline: **source → tests → build → versioned artifacts → QA (Linux Chrome + Windows Edge) → owner approval → itch.io upload.**
Nothing is published automatically. All uploads are manual and gated.

## Where things live
| Edition | Repository | Visibility | Release workflow |
|---|---|---|---|
| Free web edition + shared detectors | `Deniscoke/TESTT` | **public** | `.github/workflows/release-free.yml` (gated, disabled by default) |
| Pro (paid) | **private repo created by the owner** (not created yet) | private | written in M3 inside the private repo. **Never** published as a public GitHub Release or a public-repo artifact |

## What the owner must set up by hand

### For the Free edition (only when you decide to publish)
1. **itch.io:** create a **new** project, for example `pixel-proofreader`. Set kind = HTML, classification = Tool, and keep it in **Draft**. Do not reuse or change any existing project.
2. **itch.io:** open *Settings → API keys* and create or copy a key. Treat it as a password.
3. **GitHub `TESTT` → Settings → Secrets and variables → Actions:**
   - Secret `BUTLER_API_KEY` = the key. Never commit it.
   - Variable `ITCH_FREE_TARGET` = `<your-itch-username>/pixel-proofreader:web`.
   - Variable `ITCH_PUBLISH_ENABLED` = `true`, set **only when you are ready**. Delete it or set it to `false` to disable publishing again.
4. **GitHub → Settings → Environments → New environment `itch-free`:** add yourself as a **required reviewer**. This is available on GitHub Free because `TESTT` is public.
5. **Merge to `main` first.** GitHub only allows manual dispatch for workflows that exist on the default branch. Then go to *Actions → Release Free edition → Run workflow*, enter the version from `web/VERSION`, and set `publish` = true.
6. Approve the `itch-free` deployment when GitHub asks. butler uploads `index.html` to the `web` channel.
7. On itch.io: check the draft page, tick *"This file will be played in the browser"*, set the viewport size (for example 1280×800, with fullscreen enabled), then make it public **yourself**.

Before any of that, a dry run of everything except the upload is: run the workflow with `publish` = false. Tests, build and Windows QA all run, and nothing is uploaded.

### For Pro (after M3)
- **Create a private repository** (for example `Deniscoke/pixel-proofreader-pro`) and attach it to the Claude session.
- On GitHub Free, private repos **cannot use environments with required reviewers**. The Pro release workflow will instead be gated by: manual dispatch by the repository owner only, a typed confirmation input, an `ITCH_PUBLISH_ENABLED` variable, and the `BUTLER_API_KEY` secret. GitHub Pro (paid) would add reviewer-protected environments. That is optional, and it's your decision.
- Create a separate itch.io project for Pro, priced at $9, with downloads delivered only after purchase.

## Prerequisites to deploy the Free web app anywhere
- It is a static single HTML file (`dist/web/free/index.html`, about 50 KB). Any static host works: the itch.io HTML upload, GitHub Pages, Netlify or Cloudflare Pages. No server, database or build step is needed at the host.
- Decide the hosting place and domain (owner). Deploying to a public host was **not** done and needs approval.
- Optional: set `PRO_URL` at build time once the Pro page exists. The "Get Pro" button stays disabled ("coming soon") until then.

## Reproducibility
- `node tools/build_web.mjs` gives byte-identical ZIPs across runs on the same toolchain (CI checks this).
- Tooling: Node 22, `zip`, Lua 5.4 (reference tests), and `playwright-core` 1.56.1 (dev-only, pinned in `package-lock.json`). Tests use browsers already installed on the machine, so nothing is downloaded at test time.
