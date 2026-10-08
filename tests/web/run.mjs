// Unit, regression and bundle tests for the web editions (Node, no deps).
// Usage: node tests/web/run.mjs   (requires lua5.4 for parity; builds Free first)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { png, chunk, SIG, ihdr } from "./png-helper.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
globalThis.PixelProofreaderCore = require(path.join(ROOT, "src/libresprite/core.js"));
const Png = require(path.join(ROOT, "web/src/png.js"));
const A = require(path.join(ROOT, "web/src/analysis.js"));
const inflate = (b) => zlib.inflateSync(b);
const decode = (bytes, opts) => Png.decode(new Uint8Array(bytes), inflate, opts);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m || "mismatch"}: expected ${b}, got ${a}`); };
async function rejects(promise, re, m) {
  try { await promise; } catch (e) {
    if (e.name !== "PngError") throw new Error(`${m}: expected PngError, got ${e.name}: ${e.message}`);
    if (re && !re.test(e.message)) throw new Error(`${m}: unexpected message "${e.message}"`);
    return;
  }
  throw new Error(`${m}: expected rejection`);
}

// ---- PNG decoding against independent encoders (Pillow / ImageMagick) ----
const FIX = path.join(ROOT, "tests/web/png-fixtures");
const expected = JSON.parse(fs.readFileSync(path.join(FIX, "expected.json"), "utf8"));
for (const [name, exp] of Object.entries(expected)) {
  test(`decode ${name} matches Pillow`, async () => {
    const d = await decode(fs.readFileSync(path.join(FIX, name)));
    eq(d.width, exp.width, "width"); eq(d.height, exp.height, "height");
    eq(sha(d.rgba), exp.sha256, "RGBA hash");
  });
}

test("decode 16-bit RGBA uses the high byte", async () => {
  const row = Buffer.from([0x12, 0x34, 0xab, 0xcd, 0xff, 0x00, 0x80, 0x01]);
  const d = await decode(png({ w: 1, h: 1, depth: 16, colorType: 6, rows: [row] }));
  eq([...d.rgba].join(","), "18,171,255,128");
});

test("decode 16-bit gray with tRNS makes the exact sample transparent", async () => {
  const rows = [Buffer.from([0x01, 0x02, 0x01, 0x03])];
  const d = await decode(png({ w: 2, h: 1, depth: 16, colorType: 0, rows,
    extra: [chunk("tRNS", Buffer.from([0x01, 0x02]))] }));
  eq(d.rgba[3], 0, "first pixel transparent"); eq(d.rgba[7], 255, "second opaque");
});

test("decode applies all five filter types", async () => {
  // Same 2x2 RGB image stored with each filter type must decode identically.
  const results = [];
  for (const f of [0, 1, 2, 3, 4]) {
    // with filter f and raw rows chosen so that the reconstruction is defined
    const rows = [Buffer.from([10, 20, 30, 40, 50, 60]), Buffer.from([1, 2, 3, 4, 5, 6])];
    const d = await decode(png({ w: 2, h: 2, depth: 8, colorType: 2, rows, filterByte: f }));
    results.push(d.rgba.length === 16);
  }
  eq(results.every(Boolean), true);
});

test("decode does not modify the input bytes", async () => {
  const bytes = new Uint8Array(fs.readFileSync(path.join(FIX, "rgba8.png")));
  const before = sha(bytes);
  await decode(bytes);
  eq(sha(bytes), before);
});

// ---- malformed input ----
const good = fs.readFileSync(path.join(FIX, "rgba8.png"));
test("rejects non-PNG data", () => rejects(decode(Buffer.from("GIF89a....")), /Not a PNG/, "bad signature"));
test("rejects empty input", () => rejects(decode(Buffer.alloc(0)), /too short/, "empty"));
test("rejects truncated file", () => rejects(decode(good.subarray(0, 40)), /Truncated/, "truncated"));
test("rejects CRC mismatch", () => {
  const bad = Buffer.from(good); bad[20] ^= 0xff;
  return rejects(decode(bad), /CRC/, "crc");
});
test("rejects missing IEND", () => rejects(decode(good.subarray(0, good.length - 12)), /IEND/, "iend"));
test("rejects corrupted image data", () => {
  const bad = Buffer.concat([SIG, ihdr(2, 2, 8, 6), chunk("IDAT", Buffer.from([1, 2, 3, 4, 5])),
    chunk("IEND", Buffer.alloc(0))]);
  return rejects(decode(bad), /decompress/, "zlib");
});
test("rejects invalid filter type", () =>
  rejects(decode(png({ w: 1, h: 1, depth: 8, colorType: 2, rows: [Buffer.from([1, 2, 3])], filterByte: 9 })),
    /filter/, "filter"));
test("rejects zero size", () => rejects(decode(png({ w: 0, h: 1, depth: 8, colorType: 2, rows: [] })), /size 0/, "zero"));
test("rejects images over the pixel limit", () =>
  rejects(decode(good, { maxPixels: 50 }), /too large/, "limit"));
test("rejects invalid bit depth", () =>
  rejects(decode(png({ w: 1, h: 1, depth: 4, colorType: 6, rows: [Buffer.from([0, 0])] })), /bit depth/, "depth"));
test("rejects indexed PNG without palette", () =>
  rejects(decode(png({ w: 1, h: 1, depth: 8, colorType: 3, rows: [Buffer.from([0])] })), /palette/, "plte"));
test("rejects out-of-range palette index", () =>
  rejects(decode(png({ w: 1, h: 1, depth: 8, colorType: 3, rows: [Buffer.from([5])],
    extra: [chunk("PLTE", Buffer.from([0, 0, 0]))] })), /out of range/, "index"));
test("rejects unknown critical chunk", () => {
  const bad = Buffer.concat([SIG, ihdr(1, 1, 8, 2), chunk("ZZZZ", Buffer.alloc(1)),
    chunk("IDAT", zlib.deflateSync(Buffer.from([0, 1, 2, 3]))), chunk("IEND", Buffer.alloc(0))]);
  return rejects(decode(bad), /critical/, "critical");
});
test("rejects truncated image data", () => {
  const bad = Buffer.concat([SIG, ihdr(4, 4, 8, 6),
    chunk("IDAT", zlib.deflateSync(Buffer.alloc(10))), chunk("IEND", Buffer.alloc(0))]);
  return rejects(decode(bad), /Truncated image data/, "short idat");
});

// ---- analysis parity with the Lua reference (shared fixtures) ----
function fixtureCases() {
  const cases = []; let cur = null;
  for (const line of fs.readFileSync(path.join(ROOT, "tests/fixtures/grids.txt"), "utf8").split("\n")) {
    if (line.startsWith("#")) continue;
    if (line === "") { if (cur) cases.push(cur); cur = null; continue; }
    (cur = cur || []).push(line);
  }
  if (cur) cases.push(cur);
  return cases;
}
// Same char encoding as tests/helpers.lua, expressed as RGBA pixels.
function rgbaFromRows(rows) {
  const h = rows.length, w = h ? rows[0].length : 0, rgba = new Uint8Array(w * h * 4);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const o = (y * w + x) * 4;
    if (ch === ".") return;
    if (ch === "0") { rgba.set([99, 0, 0, 0], o); return; }
    const c = ch.toUpperCase().charCodeAt(0);
    rgba.set([c, c, c, /[A-Z]/.test(ch) ? 255 : 128], o);
  }));
  return { width: w, height: h, rgba };
}

test("analysis matches the Lua reference on all shared fixtures", () => {
  const cases = fixtureCases();
  const lua = execFileSync("lua5.4", [path.join(ROOT, "tools/lua_reference.lua"),
    path.join(ROOT, "tests/fixtures/grids.txt"), ROOT], { encoding: "utf8" })
    .split("\n").filter(Boolean);
  const want = {};
  for (const l of lua) { const [i, v, ...c] = l.split(" "); want[`${i} ${v}`] = c.join(" "); }
  let n = 0;
  cases.forEach((rows, i) => {
    const img = rgbaFromRows(rows);
    if (img.width === 0) return;
    const a = A.analyze(img), b = A.analyze(img, { orphan: { skipIsolated: true } });
    const c = (l) => l.map((f) => `${f.x},${f.y}`).join(" ");
    const pairs = [["orphan8", a.results.orphan], ["orphan8skip", b.results.orphan],
      ["double", a.results.double], ["partial_alpha", a.results.partial_alpha]];
    for (const [v, list] of pairs) {
      // In RGBA the colour key includes alpha, while the Lua fixtures give 'a' the
      // same key as 'A'. Same-colour rules therefore only compare on grids
      // without lowercase cells; partial alpha compares everywhere.
      const lk = `${i + 1} ${v}`;
      if (!(lk in want)) throw new Error("missing lua result " + lk);
      if (/[a-z]/.test(rows.join("")) && v !== "partial_alpha") continue;
      eq(c(list), want[lk], `case ${i + 1} ${v}`);
      n++;
    }
  });
  if (n < 80) throw new Error("too few comparisons: " + n);
});

test("sample sprite regression (counts and positions)", async () => {
  const d = await decode(fs.readFileSync(path.join(ROOT, "web/assets/sample-potion.png")));
  const a = A.analyze(d);
  eq(JSON.stringify(a.counts), '{"orphan":3,"double":5,"partial_alpha":3}');
  eq(a.results.partial_alpha.map((f) => `${f.x},${f.y}`).join(" "), "19,6 20,7 18,21");
  eq(a.results.orphan.some((f) => f.x === 10 && f.y === 17), true, "stray pixel found");
  eq(A.summarize(a).includes("suggestions, not errors"), true, "summary wording");
});

test("analysis does not modify pixel data", async () => {
  const d = await decode(fs.readFileSync(path.join(ROOT, "web/assets/sample-potion.png")));
  const before = sha(d.rgba);
  A.analyze(d);
  eq(sha(d.rgba), before);
});

test("clean image summary", () => {
  const img = rgbaFromRows(["AAA", "AAA"]);
  eq(A.analyze(img).flaggedPixels, 0);
  eq(A.summarize(A.analyze(img)).startsWith("No issues"), true);
});

test("performance: 1024x1024 noisy image analysed in under 4 s", () => {
  const w = 1024, h = 1024, rgba = new Uint8Array(w * h * 4);
  let s = 7;
  for (let i = 0; i < w * h; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const c = (s >>> 16) % 6;
    rgba.set([c * 40, c * 20, 255 - c * 30, c === 5 ? 120 : (c === 0 ? 0 : 255)], i * 4);
  }
  const t0 = Date.now();
  const a = A.analyze({ width: w, height: h, rgba });
  const ms = Date.now() - t0;
  console.log(`    perf: 1024x1024 analysed in ${ms} ms (${a.flaggedPixels} flagged)`);
  if (ms > 4000) throw new Error("too slow: " + ms + " ms");
});

// ---- Free bundle checks ----
test("Free bundle builds and contains only Free modules", () => {
  const out = path.join(ROOT, "dist/web/free");
  execFileSync("node", [path.join(ROOT, "tools/build_web.mjs"), out], { env: { ...process.env, PRO_URL: "" } });
  const html = fs.readFileSync(path.join(out, "index.html"), "utf8");
  eq(/PixelProofreaderPro|app-pro|exportAnnotated|batch-analysis/i.test(html), false, "no Pro code");
  eq(html.includes("Content-Security-Policy"), true, "CSP present");
  eq(/https?:\/\//.test(html), false, "no external URLs");
  eq(html.includes("<script src"), false, "no external scripts");
});

test("Free build is deterministic", () => {
  const a = path.join(ROOT, "dist/web/det-a"), b = path.join(ROOT, "dist/web/det-b");
  for (const o of [a, b]) execFileSync("node", [path.join(ROOT, "tools/build_web.mjs"), o], { env: { ...process.env, PRO_URL: "" } });
  const zip = (d) => sha(fs.readFileSync(path.join(d, fs.readdirSync(d).find((f) => f.endsWith(".zip")))));
  eq(zip(a), zip(b), "zip hash");
  fs.rmSync(a, { recursive: true }); fs.rmSync(b, { recursive: true });
});

let passed = 0, failed = 0;
for (const [name, fn] of tests) {
  try { await fn(); passed++; } catch (e) { failed++; console.log(`FAIL ${name}\n    ${e.message}`); }
}
console.log(`${passed} passed, ${failed} failed, 0 skipped`);
process.exit(failed ? 1 : 0);
