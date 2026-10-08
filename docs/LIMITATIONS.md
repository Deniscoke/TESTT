# Pixel Proofreader P0: known limitations and technical risks

## Verification status
- **Not tested in Aseprite.** CI runs pure-Lua unit tests and tests the glue code against an **in-memory fake** of the documented API (`tests/fake_aseprite.lua`). The fake encodes my reading of the API docs, so it can't reveal places where the real editor behaves differently.
- Aseprite is not downloaded, built or run in CI because of EULA uncertainty (see `research/market-matrix.md`).

## API assumptions to confirm by hand (`MANUAL_QA.md`)
| Assumption | Source | Risk if wrong |
|---|---|---|
| `dofile(app.fs.joinPath(plugin.path, ...))` loads bundled modules | `app.fs` and `plugin.path` are documented. That `dofile` is available in the script sandbox is **assumed**. | The extension fails at startup (A1/A2). |
| `layer.properties("deniscoke/pixel-proofreader").owner` stores ownership | Documented for Aseprite 1.3-rc1+ | Older Aseprite: `is_owned` returns false, so the tool can't find its own layer and stacks new marker layers. User layers stay safe. |
| `sprite:newLayer/deleteLayer/newCel/deleteCel` inside `app.transaction` form one undo step | Documented | Undo might take several steps. |
| `Image(sprite.spec)` + `img:clear()` produces a blank, transparent image | Documented (`clear` uses `spec.transparentColor`) | Markers might show on a filled background. |
| Creating a layer does not change the user's art | Documented | The **active layer may move** to the new marker layer after Analyze. The prototype doesn't try to restore the selection, because the setter isn't documented. |
| The "edit_fx" menu group exists | `data/gui.xml` on Aseprite main | If missing, the commands may not appear in the menu. |

## Functional limits (by design for P0)
- Only the **active cel** is analyzed: no selection scope, no "all frames", no batch.
- Only three checks. Banding, jaggies and palette checks are deliberately out of scope.
- Doubled corners are a **heuristic warning**. Tiny 3-pixel L shapes are flagged, and in a stair double both stacked pixels are flagged. Thick or anti-aliased lines can behave unexpectedly.
- "Same color" means an exact pixel value (RGB includes alpha), with no tolerance. A semi-transparent pixel next to its opaque twin is a different color, so it can also show up as an orphan.
- Layer and cel opacity, blend modes and other layers are ignored. Only the raw pixels of one cel are read.
- **Indexed sprites:** markers use the nearest existing palette color (the palette is never changed), so marker colors may differ from magenta, cyan and orange and may be hard to see. **Gray sprites:** markers are mid-gray levels and may blend in with the art.
- The marker layer is an ordinary layer. If you don't clear it, it is saved and exported with the sprite.
- Tilemap layers aren't supported. Reference layers aren't specially handled.
- Performance: `getPixel` is called once per pixel and detectors are O(pixels). Large canvases haven't been measured in the editor.

## Packaging
- `tools/package.sh` gives byte-identical output for the same inputs **with the same `zip` version**. A different `zip` build can give a different hash, which is why the CI artifact hash is the reference.
- `package.json` uses `"license": "UNLICENSED"` because licensing terms are an owner decision.
