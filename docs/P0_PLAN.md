# Pixel Proofreader P0: implementation plan

Authorization: the **technical prototype only**, with a planned budget of $35 in Cloud Session credits. Out of scope: banding, jaggies, palette checks, AI features, CLI or batch mode, release automation, and any publication.

## Repository structure

```
src/                      ← packaged as the extension root
  package.json            Aseprite extension manifest
  plugin.lua              entry point: init(plugin) registers 2 commands
  core/                   pure Lua 5.4, no Aseprite API
    grid.lua              grid model + helpers
    detectors.lua         orphan / double / partial_alpha
    markers.lua           marker color priority, nearest palette index
  aseprite/               the only code that touches the Aseprite API
    adapter.lua           cel image → core grid (per color mode)
    marker_layer.lua      find/create/clear the tool-owned layer (takes the app as a parameter so tests can fake it)
    ui.lua                minimal dialog: run, counts, clear
tests/
  run.lua                 tiny dependency-free test runner
  test_*.lua              fixtures (ASCII grids) + assertions
  fake_aseprite.lua       in-memory fake of the documented API subset
tools/package.sh          deterministic .aseprite-extension build
docs/                     DETECTORS.md, INSTALL.md, MANUAL_QA.md, LIMITATIONS.md
.github/workflows/verify.yml  syntax check, tests, double build + hash compare, artifact
```

## Checkpoints

1. **Structure, spec, plan.** This file and `DETECTORS.md`.
2. **Core detectors and tests.** Fixtures cover each rule's positive and negative cases, empty images (0×0, fully transparent), image borders, transparency, and the input grid staying unchanged.
3. **Aseprite glue, packaging, docs, CI.** Marker-layer safety tests run against a fake API: running twice still leaves one owned layer, a user layer with the same name is untouched, user layers and cels are unchanged, and every write happens inside one transaction.

## Testing boundary

The fake Aseprite API only models the documented calls this tool uses. Passing tests prove the **core logic and the code's own contract**, not that it behaves correctly in the real editor. That needs the manual QA in a licensed copy (`MANUAL_QA.md`). Aseprite is never downloaded, built or run in CI.
