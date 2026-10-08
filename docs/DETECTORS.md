# Pixel Proofreader P0: detector specification

Scope: **P0 technical prototype only.** There are three detectors. Every finding is a *warning* about a technical pattern, not a judgement that the art is wrong. The detectors never change pixels.

## Shared model

The core (`src/core/`) works on a plain Lua grid that the Aseprite adapter builds from one cel image:

| Field | Meaning |
|---|---|
| `w`, `h` | Image size in pixels. A size of 0 is allowed and produces no findings. |
| `alpha[i]` | Alpha 0–255 for pixel `i = y*w + x + 1` (0-based `x`, `y`). |
| `key[i]` | An integer identifying the pixel's color. Two pixels count as the *same color* only if both have `alpha > 0` and identical `key`. |

A pixel is **visible** if `alpha > 0`. Fully transparent pixels (`alpha == 0`) are never reported and never count as a same-color neighbor. Positions outside the image are treated as transparent.

### Color-mode handling (the adapter's job, `src/aseprite/adapter.lua`)

| Mode | `key` | `alpha` |
|---|---|---|
| RGB | 32-bit RGBA pixel value | `app.pixelColor.rgbaA(v)` |
| Gray | 16-bit gray+alpha value | `app.pixelColor.grayaA(v)` |
| Indexed | palette index | 0 if the index equals the sprite's transparent index **and** the layer is transparent (not a background layer). Otherwise the alpha of that palette entry (palette entries can be semi-transparent). An index outside the palette gives alpha 255. |
| Tilemap | not supported in P0 | The adapter refuses with a clear message. |

Findings are reported in **image coordinates** (0-based). The adapter adds `cel.position` before drawing markers. Layer opacity and cel opacity are **not** pixel values and are not inspected.

## A. Orphan pixels (`orphan`)

**Rule.** A visible pixel `P` is an orphan when none of its in-bounds neighbors in the configured neighborhood is a visible pixel of the *same color*.

- `neighborhood = 8` (default): all 8 surrounding pixels. `4` checks only up, down, left and right.
- `skipIsolated = false` (default). When `true`, a pixel with **no visible neighbor at all** (for example a deliberate star or sparkle on empty background) is not reported. Only pixels that sit against other colors are reported.
- Transparent pixels are never orphans. A transparent hole inside a shape is not reported.

## B. Doubled corners (`double`)

These are warning-level and heuristic. The aim is the "L-corner" that Aseprite's pixel-perfect stroke removes while drawing, but in art that is already drawn.

For a visible pixel `P` at `(x, y)` with color `c`, check each diagonal quadrant `(dx, dy)` in `{(-1,-1), (1,-1), (-1,1), (1,1)}`:

- `H = (x+dx, y)` and `V = (x, y+dy)` both have color `c`.
- `D = (x+dx, y+dy)` does **not** have color `c`. Otherwise this is a 2×2 block, meaning a thick area rather than a 1-px line.
- `P` has **exactly two** same-color 4-neighbors, namely `H` and `V`. A third would mean `P` is inside or on the edge of a filled shape.
- It is **not** a deliberate right-angle corner. A corner counts as deliberate when *both* arms continue straight, i.e. `(x+2dx, y)` and `(x, y+2dy)` both have color `c`, as at the corner of a 1-px outline box.

If any quadrant meets all of these, `P` is reported once. In a stair-step double (`XX.` above `.XX`), **both** stacked pixels are usually reported. Removing either one normally fixes it, so the tool reports and does not choose.

## C. Partial alpha (`partial_alpha`)

**Rule.** A pixel with `0 < alpha < 255` is reported. Alpha comes from the color-mode table above, so semi-transparent palette entries are caught in Indexed mode. Pixels are only read, never modified.

## Marker output

- **Layer:** markers go on a new top-level layer named `Pixel Proofreader Markers`. The tool recognizes it **only** by the extension property `layer.properties("deniscoke/pixel-proofreader").owner == true` (Aseprite 1.3-rc1+). A user layer with the same name is never touched.
- **Color per detector:** orphan is magenta `#FF00FF`, double is cyan `#00FFFF`, partial alpha is orange `#FF8000`. If a pixel is flagged by more than one detector, the first in that order wins the marker color. The counts still include every detector.
- **Indexed sprites:** markers use the palette entry nearest to each marker color and never the transparent index. The palette is **not** changed, so marker colors can look different from the ones above. Gray sprites use the nearest gray level.
- **Each run** replaces this tool's marker cel on the analyzed frame. "Clear markers" deletes only the layers this tool owns. Every write happens inside one `app.transaction`, so one Undo reverses it.
