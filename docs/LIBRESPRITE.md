# Pixel Proofreader: LibreSprite 1.3 compatibility probe

Status: a **read-only diagnostic** that runs the same three P0 detectors (orphan pixels, doubled corners, partial alpha) on the active image and prints a text report. It does not create marker layers and does not write anything to the document. It has **not been run in LibreSprite yet**; see the manual checklist below.

## 1. What LibreSprite 1.3 scripting supports (verified in source)

Source: tag `v1.3` (commit `cdb12a323ce5ec4fce3512bc6590a90228f15bb9`), files `src/app/script/api/*.cpp` and `SCRIPTING.md`. LibreSprite 1.3 runs JavaScript in **QuickJS**.

| Need | Supported API in 1.3 | Used by the diagnostic |
|---|---|---|
| Active sprite | `app.activeSprite` (null without an active document) | yes |
| Active image | `app.activeImage`: the image of the editor's current layer and frame, or null | yes |
| Active layer and frame | `app.activeLayerNumber`, `app.activeFrameNumber` | yes (cel offset only) |
| Layers | `sprite.layerCount`, `sprite.layer(i)` (0 = bottom). There is **no `sprite.layers` array**, which is why `sprite.layers?.length` returned `undefined` in your test. | `sprite.layer(i)` |
| Layer info | `layer.name`, `isBackground`, `isTransparent`, `isImage`, `isVisible`, `isEditable`, `celCount`, `cel(frame)` | `isBackground`, `cel()` |
| Cel | `cel.x`, `cel.y`, `cel.image`, `cel.frame` | `x`, `y` |
| Pixels | `image.width`, `height`, `format`, `stride`, `getPixel(x, y)` (the binding does **no bounds check**), `getImageData()` | `getPixel` within bounds |
| Color decoding | global `pixelColor` (also exposed as `app.pixelColor`): `rgbaR/G/B/A`, `graya`, `grayaV`, `grayaA` | `rgbaA`, `grayaA` |
| Color mode | `sprite.colorMode` against `ColorMode.RGB / GRAYSCALE / INDEXED / BITMAP` | yes |
| Palette | `sprite.palette.length`, `palette.get(i)` (32-bit RGBA) | yes (Indexed mode) |
| Output | `console.log` | yes |

### Not available in 1.3, so not implemented
| Requirement | Finding |
|---|---|
| **Create a marker layer** | No layer or cel creation exists in the script API (no `newLayer`, `newCel` or equivalent). **Marker layers cannot be implemented in LibreSprite 1.3.** |
| **Undo grouping** | There is no transaction API. `sprite.commit()` is a documented no-op. Sprite size changes run their own transactions, but `image.putPixel`, `image.clear` and `image.putImageData` write straight to memory **without creating an undo step**. Drawing markers with them would be destructive, so the diagnostic never calls them. |
| Sprite transparent index | Not exposed. Indexed mode **assumes index 0** (LibreSprite's default), and the report says so. |
| Tool-owned metadata or properties | Not available. |

**Blocker for full parity with the Aseprite prototype:** the non-destructive marker layer cannot be built on the LibreSprite 1.3 API. The read-only diagnostic below is the most that version supports without workarounds.

## 2. What the diagnostic does

- It reads the active image, decodes alpha according to the color mode (the same rules as `docs/DETECTORS.md`) and runs the three detectors. The orphan check uses the 8-pixel neighborhood and also reports isolated pixels.
- It prints the counts and up to 20 coordinates per check to the console. Coordinates are canvas coordinates when the cel position can be read, otherwise image coordinates.
- If there is no sprite, no image, or an unsupported color mode (Bitmap), it prints a clear message.
- Nothing is modified, no undo step is created, and nothing is saved.

## 3. Install and run on Windows

1. Download `PixelProofreader-Diagnostic.js` from the GitHub Actions artifact **`pixel-proofreader-libresprite-diagnostic`** in the latest successful *Verify repository* run on the working branch. It is temporary and not a release. Alternatively, run `tools/build_libresprite.sh` on Linux, macOS or Git Bash.
2. Optional: check the hash in PowerShell with `Get-FileHash .\PixelProofreader-Diagnostic.js -Algorithm SHA256` and compare it with the `.sha256` file.
3. Copy the file into **the same LibreSprite scripts folder where your earlier test script worked**.
4. Restart LibreSprite, or reopen the Scripts menu, so the list is rescanned.
5. Open a **copy** of a sprite, select the layer and frame to check, then run *Scripts > PixelProofreader-Diagnostic*.
6. Read the report in the console or log window. Running it from the scripting console itself won't work, because in your test `app.activeSprite` was null there.

## 4. Manual checklist (LibreSprite 1.3, Windows)

- [ ] L1 The script appears in the Scripts menu and runs without an error.
- [ ] L2 A 16×16 RGB sprite with a 3×3 block of color A and one pixel of color B in the middle reports `Orphan pixels: 1` at that pixel.
- [ ] L3 A stair line `XX.` above `.XX` reports `Doubled corners (warning): 2`.
- [ ] L4 A pixel with 50% alpha reports `Partial alpha: 1`.
- [ ] L5 With the cel moved, the coordinates shift by the cel position.
- [ ] L6 With no sprite open, it prints the "open a sprite" message.
- [ ] L7 Afterwards, the art is unchanged, *Edit > Undo* has no new entry from the script, and the document has no new unsaved changes.
- [ ] L8 An Indexed sprite reports the transparent-index assumption.
- [ ] L9 Note how long a larger sprite takes (for example 256×256), since there is one `getPixel` call per pixel.

## 5. Limitations

- **Not run in LibreSprite yet.** The tests use a JavaScript fake built from the 1.3 source. They show the logic matches the Lua implementation, not that it runs correctly inside LibreSprite.
- There are no markers on the canvas; the report is text only. This is an API limitation, see §1.
- Only the active image of the current layer and frame is checked.
- Indexed mode assumes transparent index 0.
- Where `console.log` output appears depends on how LibreSprite shows its console. `console.log` writes to the dev console panel or log, so you may need to open that panel. This hasn't been verified.
- `getPixel` is called once per pixel, so large images may be slow.
- Bitmap color mode is not supported.
