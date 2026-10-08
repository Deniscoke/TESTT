// Node test runner for the LibreSprite JavaScript diagnostic (no dependencies).
// Usage (from repo root): node tests/js/run.js
// Requires lua5.4 on PATH: the Lua detectors are the reference implementation.
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const vm = require("vm");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const core = require(path.join(ROOT, "src/libresprite/core.js"));

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || "values differ"}: expected ${b}, got ${a}`);
}

// ---- fixtures (same encoding as tests/helpers.lua) ----
function parseFixtures(text) {
  const cases = [];
  let cur = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) continue;
    if (line === "") { if (cur) { cases.push(cur); cur = null; } continue; }
    (cur = cur || []).push(line);
  }
  if (cur) cases.push(cur);
  return cases;
}

function grid(rows) {
  const h = rows.length, w = h ? rows[0].length : 0;
  const g = core.gridNew(w, h);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error("ragged fixture");
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      if (ch === "0") core.gridSet(g, x, y, 0, 99);
      else if (/[A-Z]/.test(ch)) core.gridSet(g, x, y, 255, ch.charCodeAt(0));
      else if (/[a-z]/.test(ch)) core.gridSet(g, x, y, 128, ch.toUpperCase().charCodeAt(0));
      else throw new Error("bad fixture char " + ch);
    });
  });
  return g;
}

const VARIANTS = [
  ["orphan8", (g) => core.orphan(g, { neighborhood: 8 })],
  ["orphan8skip", (g) => core.orphan(g, { neighborhood: 8, skipIsolated: true })],
  ["orphan4", (g) => core.orphan(g, { neighborhood: 4 })],
  ["orphan4skip", (g) => core.orphan(g, { neighborhood: 4, skipIsolated: true })],
  ["double", core.double],
  ["partial_alpha", core.partial_alpha],
];

function jsLines(cases) {
  const out = [];
  cases.forEach((rows, i) => {
    const g = grid(rows);
    for (const [name, fn] of VARIANTS) {
      out.push([String(i + 1), name, ...fn(g).map((f) => `${f.x},${f.y}`)].join(" "));
    }
  });
  return out;
}

function luaLines(fixtureFile) {
  const out = execFileSync("lua5.4", [path.join(ROOT, "tools/lua_reference.lua"), fixtureFile, ROOT],
    { encoding: "utf8" });
  return out.split("\n").filter((l) => l !== "");
}

function compareParity(fixtureFile) {
  const cases = parseFixtures(fs.readFileSync(fixtureFile, "utf8"));
  const js = jsLines(cases), lua = luaLines(fixtureFile);
  eq(js.length, lua.length, "result line count");
  for (let i = 0; i < js.length; i++) {
    if (js[i] !== lua[i]) throw new Error(`parity mismatch\n  lua: ${lua[i]}\n  js:  ${js[i]}`);
  }
  return { cases: cases.length, comparisons: js.length };
}

const stats = {};

test("parity with Lua reference on shared fixtures", () => {
  stats.fixtures = compareParity(path.join(ROOT, "tests/fixtures/grids.txt"));
  if (stats.fixtures.cases < 27) throw new Error("fixture file truncated");
});

test("parity with Lua reference on 300 seeded random grids", () => {
  let seed = 20261008;
  const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296;
  const alphabet = "..AAABBa0";
  const blocks = [];
  for (let n = 0; n < 300; n++) {
    const w = 1 + Math.floor(rnd() * 9), h = 1 + Math.floor(rnd() * 9);
    const rows = [];
    for (let y = 0; y < h; y++) {
      let row = "";
      for (let x = 0; x < w; x++) row += alphabet[Math.floor(rnd() * alphabet.length)];
      rows.push(row);
    }
    blocks.push(`# random ${n}\n${rows.join("\n")}`);
  }
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "pp-")), "random.txt");
  fs.writeFileSync(file, blocks.join("\n\n") + "\n");
  stats.random = compareParity(file);
});

test("direct expectations (independent of Lua)", () => {
  const c = (list) => list.map((f) => `${f.x},${f.y}`).join(" ");
  eq(c(core.orphan(grid(["AAA", "ABA", "AAA"]))), "1,1");
  eq(c(core.double(grid(["AA.", ".AA"]))), "1,0 1,1");
  eq(c(core.double(grid(["AAAA", "A..A", "A..A", "AAAA"]))), "");
  eq(c(core.partial_alpha(grid(["AaA", ".b."]))), "1,0 1,1");
  eq(core.orphan(grid([])).length, 0);
  let threw = false;
  try { core.orphan(grid(["A"]), { neighborhood: 6 }); } catch (e) { threw = true; }
  eq(threw, true, "invalid neighbourhood rejected");
});

test("detectors do not modify the grid", () => {
  const g = grid(["AAB", "aA.", "0BB"]);
  const before = JSON.stringify(g);
  core.runAll(g, null, { orphan: { neighborhood: 4, skipIsolated: true } });
  eq(JSON.stringify(g), before);
});

// ---- adapter (gridFromSource) with LibreSprite-style values ----
const ColorMode = Object.freeze({ RGB: 0, GRAYSCALE: 1, INDEXED: 2, BITMAP: 3 });
const pixelColor = {
  rgba: (r, g, b, a = 255) => (r | (g << 8) | (b << 16) | (a << 24)) >>> 0,
  rgbaA: (c) => (c >>> 24) & 0xff,
  graya: (v, a = 255) => (v | (a << 8)) >>> 0,
  grayaA: (c) => (c >>> 8) & 0xff,
};

function source(mode, pixels, w, extra) {
  return Object.assign({
    width: w, height: pixels.length / w, getPixel: (x, y) => pixels[y * w + x],
    mode, ColorMode, pixelColor, paletteLength: 0, paletteColor: () => 0,
    transparentIndex: 0, isBackground: false,
  }, extra || {});
}

test("adapter: RGB alpha and keys", () => {
  const px = [pixelColor.rgba(1, 2, 3), pixelColor.rgba(1, 2, 3, 128), 0];
  const g = core.gridFromSource(source(ColorMode.RGB, px, 3)).grid;
  eq(g.alpha.join(","), "255,128,0");
  eq(g.key[0], px[0]);
});

test("adapter: Grayscale alpha", () => {
  const g = core.gridFromSource(source(ColorMode.GRAYSCALE,
    [pixelColor.graya(40), pixelColor.graya(40, 10)], 2)).grid;
  eq(g.alpha.join(","), "255,10");
});

test("adapter: Indexed transparent index, palette alpha, background", () => {
  const pal = [pixelColor.rgba(0, 0, 0), pixelColor.rgba(255, 0, 0), pixelColor.rgba(0, 255, 0, 100)];
  const extra = { paletteLength: 3, paletteColor: (i) => pal[i] };
  const g = core.gridFromSource(source(ColorMode.INDEXED, [0, 1, 2, 9], 4, extra)).grid;
  eq(g.alpha.join(","), "0,255,100,255");
  const bg = core.gridFromSource(source(ColorMode.INDEXED, [0, 1, 2, 9], 4,
    Object.assign({ isBackground: true }, extra))).grid;
  eq(bg.alpha[0], 255, "transparent index opaque on background");
});

test("adapter: unsupported mode returns an error", () => {
  const r = core.gridFromSource(source(ColorMode.BITMAP, [0], 1));
  if (!r.error || r.grid) throw new Error("expected error");
});

// ---- main.js smoke test in a sandbox with a read-only fake LibreSprite ----
function fakeEnv(opts) {
  const writes = [];
  const forbid = (name) => () => { writes.push(name); throw new Error("write attempted: " + name); };
  const w = opts.width, h = opts.height, px = opts.pixels;
  const image = opts.noImage ? null : {
    width: w, height: h,
    getPixel: (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) throw new Error("getPixel out of bounds");
      return px[y * w + x];
    },
    putPixel: forbid("putPixel"), clear: forbid("clear"), putImageData: forbid("putImageData"),
  };
  const cel = { x: opts.celX || 0, y: opts.celY || 0, setPosition: forbid("setPosition") };
  const layer = { isBackground: !!opts.isBackground, cel: () => cel };
  const palette = { length: 0, get: () => 0, set: forbid("palette.set") };
  const sprite = opts.noSprite ? null : {
    colorMode: opts.mode, palette, layer: () => layer,
    save: forbid("save"), saveAs: forbid("saveAs"), resize: forbid("resize"), crop: forbid("crop"),
  };
  const logs = [];
  const app = { activeSprite: sprite, activeImage: image, activeLayerNumber: 0,
    activeFrameNumber: 0, pixelColor };
  const ctx = vm.createContext({ app, ColorMode, console: { log: (t) => logs.push(String(t)) } });
  return { ctx, logs, writes };
}

function runScript(file, env) {
  vm.runInContext(fs.readFileSync(file, "utf8"), env.ctx, { filename: file });
}

const DIST = path.join(ROOT, "dist/libresprite/PixelProofreader-Diagnostic.js");

test("built script: RGB sprite report, offsets applied, nothing written", () => {
  if (!fs.existsSync(DIST)) throw new Error("run tools/build_libresprite.sh first");
  const A = pixelColor.rgba(65, 65, 65), B = pixelColor.rgba(66, 66, 66);
  const semi = pixelColor.rgba(97, 97, 97, 128);
  const env = fakeEnv({ mode: ColorMode.RGB, width: 3, height: 3, celX: 10, celY: 20,
    pixels: [A, A, A, A, B, A, A, A, semi] });
  runScript(DIST, env);
  eq(env.writes.length, 0, "no write calls");
  const out = env.logs.join("\n");
  if (!/Orphan pixels: 2 /.test(out)) throw new Error("unexpected report:\n" + out);
  if (!/\(11,21\)/.test(out)) throw new Error("cel offset not applied:\n" + out);
  if (!/Partial alpha: 1 /.test(out)) throw new Error("partial alpha missing:\n" + out);
  if (!/Nothing was modified\./.test(out)) throw new Error("missing footer");
});

test("built script: graceful messages without sprite / image / supported mode", () => {
  const noSprite = fakeEnv({ noSprite: true, width: 1, height: 1, pixels: [0], mode: 0 });
  runScript(DIST, noSprite);
  if (!/open a sprite/.test(noSprite.logs[0])) throw new Error(noSprite.logs[0]);
  const noImage = fakeEnv({ noImage: true, width: 1, height: 1, pixels: [0], mode: 0 });
  runScript(DIST, noImage);
  if (!/no image/.test(noImage.logs[0])) throw new Error(noImage.logs[0]);
  const bitmap = fakeEnv({ width: 1, height: 1, pixels: [0], mode: ColorMode.BITMAP });
  runScript(DIST, bitmap);
  if (!/Unsupported color mode/.test(bitmap.logs[0])) throw new Error(bitmap.logs[0]);
});

// ---- run ----
let passed = 0, failed = 0;
for (const [name, fn] of tests) {
  try { fn(); passed++; } catch (e) { failed++; console.log(`FAIL ${name}\n    ${e.message}`); }
}
if (stats.fixtures) console.log(`parity: ${stats.fixtures.cases} fixture grids, ${stats.fixtures.comparisons} detector comparisons`);
if (stats.random) console.log(`parity: ${stats.random.cases} random grids, ${stats.random.comparisons} detector comparisons`);
console.log(`${passed} passed, ${failed} failed, 0 skipped`);
process.exit(failed === 0 ? 0 : 1);
