# Pixel Proofreader P0: manual QA checklist (licensed Aseprite)

Passing unit tests in CI **do not** prove that the extension works in Aseprite. This checklist is the only editor verification. Run it on **copies** of sprites. Record the Aseprite version and OS, plus pass or fail and notes for each line.

Aseprite version: ________  OS: ________  Extension SHA-256: ________

## A. Install and load
- [ ] A1 The extension installs without an error dialog.
- [ ] A2 *Edit > FX* shows "Pixel Proofreader: Analyze..." and "Pixel Proofreader: Clear Markers".
- [ ] A3 With no sprite open, both commands are disabled or do nothing, and nothing crashes.

## B. Detection (RGB sprite)
Make a 16×16 RGB sprite on a transparent layer "Art" and draw:
- [ ] B1 A 3×3 block of color A with one pixel of color B in the middle: **Orphan = 1**, magenta marker on the B pixel.
- [ ] B2 A stair line `XX.` above `.XX` (1 px wide): **Doubled corners = 2**, cyan markers on the stacked pair.
- [ ] B3 A 1-px outline rectangle: its corners are **not** flagged as doubled corners.
- [ ] B4 A pixel at 50% alpha (set alpha in the color picker): **Partial alpha = 1**, orange marker.
- [ ] B5 A single isolated pixel: flagged as an orphan. With "Ignore fully isolated pixels" checked it is not flagged.
- [ ] B6 Transparent holes inside shapes are never flagged.
- [ ] B7 Counts in the dialog match the markers you can see.

## C. Non-destructive behavior
- [ ] C1 After Analyze, the "Art" pixels are unchanged (toggle the marker layer's visibility and compare).
- [ ] C2 Layer names, order, frames, palette and cels of user layers are unchanged.
- [ ] C3 *Edit > Undo* once removes the markers. *Redo* restores them.
- [ ] C4 Running Analyze twice leaves exactly **one** "Pixel Proofreader Markers" layer.
- [ ] C5 Rename a normal user layer to "Pixel Proofreader Markers", then Analyze and Clear: that user layer is **not** deleted or changed.
- [ ] C6 Clear markers removes only the tool's layer, and *Undo* brings it back.
- [ ] C7 The file is **not** saved automatically (the title still shows unsaved changes, and nothing on disk changed).

## D. Robustness
- [ ] D1 Selecting a frame or layer with no cel shows a message instead of an error.
- [ ] D2 Selecting the marker layer and clicking Analyze shows "Select an art layer".
- [ ] D3 A group layer selected: a message, no crash.
- [ ] D4 A tilemap layer: the "not supported" message.
- [ ] D5 Indexed sprite: detection works, markers use existing palette colors, and the **palette is unchanged** (no new entries).
- [ ] D6 Grayscale sprite: detection works, and markers are visible as gray levels.
- [ ] D7 A cel moved partly off the canvas: no error, and markers only appear on the canvas.
- [ ] D8 Multi-frame sprite: analyzing frame 2 does not touch the markers on frame 1.
- [ ] D9 A large sprite (for example 512×512) finishes in an acceptable time. Note how long it takes.

## E. False-positive review (feeds the GO/FIX/STOP call)
Run it on 3–5 real sprites of your own. For each check, note *useful / noise / intentional*.

| Sprite | Orphan (u/n/i) | Doubled corner (u/n/i) | Partial alpha (u/n/i) |
|---|---|---|---|
| | | | |
