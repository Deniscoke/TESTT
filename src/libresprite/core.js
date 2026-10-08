// Pixel Proofreader - LibreSprite read-only diagnostic: pure detector core.
// JavaScript port of src/core/grid.lua + src/core/detectors.lua (the tested
// Lua reference implementation). Rules: docs/DETECTORS.md. No LibreSprite API
// is used in this file; it never modifies anything it is given.

var PixelProofreaderCore = (function () {
  "use strict";

  var N8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
  var N4 = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  var QUADRANTS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  var ORDER = ["orphan", "double", "partial_alpha"];

  // Grid: { w, h, alpha: number[], key: number[] }, index y * w + x (0-based).
  function gridNew(w, h) {
    if (!(w >= 0 && h >= 0 && w === Math.floor(w) && h === Math.floor(h))) {
      throw new Error("invalid grid size");
    }
    var g = { w: w, h: h, alpha: new Array(w * h), key: new Array(w * h) };
    for (var i = 0; i < w * h; i++) { g.alpha[i] = 0; g.key[i] = 0; }
    return g;
  }

  function gridSet(g, x, y, alpha, key) {
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) throw new Error("pixel out of bounds");
    if (!(alpha >= 0 && alpha <= 255)) throw new Error("alpha out of range");
    g.alpha[y * g.w + x] = alpha;
    g.key[y * g.w + x] = key;
  }

  function same(g, x, y, key) {
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return false;
    var i = y * g.w + x;
    return g.alpha[i] > 0 && g.key[i] === key;
  }

  function visible(g, x, y) {
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return false;
    return g.alpha[y * g.w + x] > 0;
  }

  // A. Orphan pixels. opts.neighborhood: 8 (default) or 4; opts.skipIsolated.
  function orphan(g, opts) {
    opts = opts || {};
    var hood = opts.neighborhood || 8;
    if (hood !== 8 && hood !== 4) throw new Error("neighborhood must be 4 or 8");
    var offsets = hood === 8 ? N8 : N4;
    var out = [];
    for (var y = 0; y < g.h; y++) {
      for (var x = 0; x < g.w; x++) {
        var i = y * g.w + x;
        if (g.alpha[i] > 0) {
          var key = g.key[i], hasSame = false, hasVisible = false;
          for (var k = 0; k < offsets.length; k++) {
            var nx = x + offsets[k][0], ny = y + offsets[k][1];
            if (same(g, nx, ny, key)) { hasSame = true; break; }
            if (visible(g, nx, ny)) hasVisible = true;
          }
          if (!hasSame && !(opts.skipIsolated && !hasVisible)) out.push({ x: x, y: y });
        }
      }
    }
    return out;
  }

  // B. Doubled corners (warning-level heuristic).
  function double(g) {
    var out = [];
    for (var y = 0; y < g.h; y++) {
      for (var x = 0; x < g.w; x++) {
        var i = y * g.w + x;
        if (g.alpha[i] > 0) {
          var c = g.key[i], n4 = 0;
          for (var k = 0; k < N4.length; k++) {
            if (same(g, x + N4[k][0], y + N4[k][1], c)) n4++;
          }
          if (n4 === 2) {
            for (var q = 0; q < QUADRANTS.length; q++) {
              var dx = QUADRANTS[q][0], dy = QUADRANTS[q][1];
              if (same(g, x + dx, y, c) &&
                  same(g, x, y + dy, c) &&
                  !same(g, x + dx, y + dy, c) &&
                  !(same(g, x + 2 * dx, y, c) && same(g, x, y + 2 * dy, c))) {
                out.push({ x: x, y: y });
                break;
              }
            }
          }
        }
      }
    }
    return out;
  }

  // C. Partial alpha: 0 < alpha < 255.
  function partialAlpha(g) {
    var out = [];
    for (var y = 0; y < g.h; y++) {
      for (var x = 0; x < g.w; x++) {
        var a = g.alpha[y * g.w + x];
        if (a > 0 && a < 255) out.push({ x: x, y: y });
      }
    }
    return out;
  }

  var DETECTORS = { orphan: orphan, double: double, partial_alpha: partialAlpha };

  function runAll(g, enabled, opts) {
    var results = {};
    for (var k = 0; k < ORDER.length; k++) {
      var id = ORDER[k];
      results[id] = (!enabled || enabled[id]) ? DETECTORS[id](g, opts && opts[id]) : [];
    }
    return results;
  }

  // Builds a grid from a read-only pixel source (adapter, LibreSprite 1.3).
  // src = { width, height, getPixel(x, y), mode, ColorMode, pixelColor,
  //         paletteColor(i) -> 32-bit RGBA or undefined, paletteLength,
  //         transparentIndex, isBackground }
  // Returns { grid } or { error }.
  function gridFromSource(src) {
    var CM = src.ColorMode, pc = src.pixelColor, alphaOf;
    if (src.mode === CM.RGB) {
      alphaOf = function (v) { return pc.rgbaA(v); };
    } else if (src.mode === CM.GRAYSCALE) {
      alphaOf = function (v) { return pc.grayaA(v); };
    } else if (src.mode === CM.INDEXED) {
      var byIndex = {};
      for (var i = 0; i < src.paletteLength; i++) byIndex[i] = pc.rgbaA(src.paletteColor(i));
      alphaOf = function (v) {
        if (v === src.transparentIndex && !src.isBackground) return 0;
        return byIndex.hasOwnProperty(v) ? byIndex[v] : 255;
      };
    } else {
      return { error: "Unsupported color mode (only RGB, Grayscale and Indexed are supported)." };
    }
    var g = gridNew(src.width, src.height);
    for (var y = 0; y < src.height; y++) {
      for (var x = 0; x < src.width; x++) {
        var v = src.getPixel(x, y);
        gridSet(g, x, y, alphaOf(v), v);
      }
    }
    return { grid: g };
  }

  var LABELS = {
    orphan: "Orphan pixels",
    double: "Doubled corners (warning)",
    partial_alpha: "Partial alpha",
  };

  // Plain-text report. offset = { x, y } cel position or null (unknown).
  function formatReport(results, info, maxList) {
    maxList = maxList || 20;
    var ox = info.offset ? info.offset.x : 0, oy = info.offset ? info.offset.y : 0;
    var lines = ["Pixel Proofreader - read-only diagnostic (LibreSprite)"];
    lines.push("Image " + info.width + "x" + info.height + ", color mode " + info.modeName +
      (info.offset ? ", cel at " + ox + "," + oy : ", cel position unknown (image coordinates)"));
    for (var k = 0; k < ORDER.length; k++) {
      var id = ORDER[k], list = results[id];
      var coords = [];
      for (var j = 0; j < list.length && j < maxList; j++) {
        coords.push("(" + (list[j].x + ox) + "," + (list[j].y + oy) + ")");
      }
      lines.push(LABELS[id] + ": " + list.length +
        (coords.length ? "  " + coords.join(" ") + (list.length > maxList ? " ..." : "") : ""));
    }
    for (var n = 0; n < info.notes.length; n++) lines.push("Note: " + info.notes[n]);
    lines.push("Nothing was modified.");
    return lines.join("\n");
  }

  return {
    ORDER: ORDER, gridNew: gridNew, gridSet: gridSet, orphan: orphan, double: double,
    partial_alpha: partialAlpha, runAll: runAll, gridFromSource: gridFromSource,
    formatReport: formatReport,
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PixelProofreaderCore;
