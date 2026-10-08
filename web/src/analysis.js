// Pixel Proofreader: shared analysis layer (Free edition rules).
// Uses the tested detector core (src/libresprite/core.js, global
// PixelProofreaderCore) unchanged. Pure functions, no DOM.

var PixelProofreaderAnalysis = (function () {
  "use strict";

  var Core = (typeof PixelProofreaderCore !== "undefined") ? PixelProofreaderCore
    : (typeof require === "function" ? require("../../src/libresprite/core.js") : null);

  // Rule metadata. "kind": technical = objective pixel property,
  // suggestion = common pixel-art convention you may break on purpose.
  var RULES = [
    {
      id: "orphan", label: "Orphan pixels", color: "#ff2bd6", kind: "suggestion",
      short: "A pixel with no neighbour of the same colour.",
      long: "Single stray pixels often come from a slipped brush stroke or leftover colour. " +
        "They are fine when intentional (sparkles, eye highlights, stars). " +
        "Rule: a visible pixel none of whose 8 neighbours has exactly the same colour.",
    },
    {
      id: "double", label: "Doubled corners", color: "#00d5ff", kind: "suggestion",
      short: "An extra pixel that makes a 1-pixel line look thick at a corner.",
      long: "In 1-pixel-wide lines, an L-shaped corner adds a pixel that can usually be removed " +
        "without breaking the line, which keeps lines crisp. Deliberate right-angle corners " +
        "(both arms continue straight) are not flagged. Usually both stacked pixels are marked; " +
        "removing either one fixes it.",
    },
    {
      id: "partial_alpha", label: "Partial transparency", color: "#ff9500", kind: "technical",
      short: "A pixel that is neither fully opaque nor fully transparent.",
      long: "Pixels with alpha between 1 and 254 are often accidental (soft brushes, scaling, " +
        "export settings) and can show halos in game engines. Ignore this if you use " +
        "semi-transparency on purpose (glass, shadows, glows).",
    },
  ];

  var RULE_BY_ID = {};
  RULES.forEach(function (r) { RULE_BY_ID[r.id] = r; });

  // RGBA bytes -> detector grid (typed arrays; key = packed RGBA, as in
  // Aseprite/LibreSprite pixel values).
  function gridFromRgba(width, height, rgba) {
    var n = width * height;
    var alpha = new Uint8Array(n), key = new Uint32Array(n);
    for (var i = 0, o = 0; i < n; i++, o += 4) {
      alpha[i] = rgba[o + 3];
      key[i] = (rgba[o] | (rgba[o + 1] << 8) | (rgba[o + 2] << 16) | (rgba[o + 3] << 24)) >>> 0;
    }
    return { w: width, h: height, alpha: alpha, key: key };
  }

  function stats(grid) {
    var colors = {}, colorCount = 0, visible = 0;
    for (var i = 0; i < grid.w * grid.h; i++) {
      if (grid.alpha[i] > 0) {
        visible++;
        if (!colors[grid.key[i]]) { colors[grid.key[i]] = 1; colorCount++; }
      }
    }
    return { visiblePixels: visible, colorCount: colorCount };
  }

  // decoded: { width, height, rgba }. options.orphan: { skipIsolated }.
  // Returns { width, height, results: {id: [{x,y}]}, counts, flaggedPixels, stats, ms }.
  function analyze(decoded, options) {
    var t0 = Date.now();
    var grid = gridFromRgba(decoded.width, decoded.height, decoded.rgba);
    var o = options || {};
    var results = Core.runAll(grid, null, {
      orphan: { neighborhood: 8, skipIsolated: !!(o.orphan && o.orphan.skipIsolated) },
    });
    var counts = {}, seen = {}, flagged = 0;
    RULES.forEach(function (r) {
      var list = results[r.id] || [];
      counts[r.id] = list.length;
      for (var i = 0; i < list.length; i++) {
        var k = list[i].y * decoded.width + list[i].x;
        if (!seen[k]) { seen[k] = 1; flagged++; }
      }
    });
    return {
      width: decoded.width, height: decoded.height, results: results, counts: counts,
      flaggedPixels: flagged, stats: stats(grid), ms: Date.now() - t0,
    };
  }

  // Plain-language one-line summary for the result banner.
  function summarize(a) {
    var total = 0;
    RULES.forEach(function (r) { total += a.counts[r.id]; });
    if (total === 0) return "No issues found by the enabled checks. Nice and clean.";
    var parts = RULES.filter(function (r) { return a.counts[r.id] > 0; })
      .map(function (r) { return a.counts[r.id] + " " + r.label.toLowerCase(); });
    return a.flaggedPixels + " pixel" + (a.flaggedPixels === 1 ? "" : "s") +
      " to review: " + parts.join(", ") + ". These are suggestions, not errors.";
  }

  return { RULES: RULES, RULE_BY_ID: RULE_BY_ID, gridFromRgba: gridFromRgba, analyze: analyze, summarize: summarize };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PixelProofreaderAnalysis;
