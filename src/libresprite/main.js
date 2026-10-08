// Pixel Proofreader - LibreSprite 1.3 read-only diagnostic entry point.
// Launch from the Scripts menu with a sprite open. Uses ONLY these calls,
// all verified in the LibreSprite v1.3 source (src/app/script/api/*.cpp):
//   app.activeSprite, app.activeImage, app.activeLayerNumber,
//   app.activeFrameNumber, app.pixelColor (rgbaA, grayaA), ColorMode,
//   sprite.colorMode, sprite.palette (length, get), sprite.layer(i),
//   layer.isBackground, layer.cel(frame), cel.x, cel.y,
//   image.width, image.height, image.getPixel, console.log.
// It never calls putPixel, clear, putImageData, setters, save or commands:
// nothing in the document is modified and no undo step is created.

(function () {
  "use strict";
  var core = PixelProofreaderCore;
  // LibreSprite 1.3 does not expose the sprite's transparent palette index to
  // scripts; LibreSprite's default is 0. Change this if your sprite differs.
  var ASSUMED_TRANSPARENT_INDEX = 0;

  function report(text) { console.log(text); }

  function run() {
    var sprite = app.activeSprite;
    if (!sprite) return "Pixel Proofreader: open a sprite and run this from the Scripts menu.";
    var image = app.activeImage;
    if (!image) return "Pixel Proofreader: the active layer/frame has no image (empty cel or group).";

    var notes = [];
    var layer = null, cel = null;
    try {
      layer = sprite.layer(app.activeLayerNumber);
      cel = layer ? layer.cel(app.activeFrameNumber) : null;
    } catch (e) {
      notes.push("Could not read the active layer/cel: " + e);
    }
    var isBackground = !!(layer && layer.isBackground);
    var offset = (cel && typeof cel.x === "number" && typeof cel.y === "number")
      ? { x: cel.x, y: cel.y } : null;

    var mode = sprite.colorMode;
    var modeName = mode === ColorMode.RGB ? "RGB" : mode === ColorMode.GRAYSCALE ? "Grayscale"
      : mode === ColorMode.INDEXED ? "Indexed" : "other (" + mode + ")";
    var palette = sprite.palette;
    if (mode === ColorMode.INDEXED) {
      notes.push("Indexed: transparent index assumed to be " + ASSUMED_TRANSPARENT_INDEX +
        (isBackground ? " (ignored: background layer is opaque)." : "."));
    }

    var built = core.gridFromSource({
      width: image.width, height: image.height,
      getPixel: function (x, y) { return image.getPixel(x, y); },
      mode: mode, ColorMode: ColorMode, pixelColor: app.pixelColor,
      paletteLength: mode === ColorMode.INDEXED ? palette.length : 0,
      paletteColor: function (i) { return palette.get(i); },
      transparentIndex: ASSUMED_TRANSPARENT_INDEX, isBackground: isBackground,
    });
    if (built.error) return "Pixel Proofreader: " + built.error;

    var results = core.runAll(built.grid, null, { orphan: { neighborhood: 8, skipIsolated: false } });
    return core.formatReport(results, {
      width: image.width, height: image.height, modeName: modeName, offset: offset, notes: notes,
    });
  }

  try {
    report(run());
  } catch (e) {
    report("Pixel Proofreader: unexpected error: " + e);
  }
})();
