// Builds the single-file Free web edition (no dependencies, deterministic).
// Usage: node tools/build_web.mjs [outDir]   env PRO_URL=<store url> (optional)
// Output: <outDir>/index.html and pixel-proofreader-free-web-<version>.zip
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "dist/web/free"));
const VERSION = fs.readFileSync(path.join(ROOT, "web/VERSION"), "utf8").trim();
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

// Free edition bundle: only these modules. Pro code is never part of it.
const SCRIPTS = [
  "src/libresprite/core.js",
  "web/src/png.js",
  "web/src/analysis.js",
  "web/src/viewer.js",
  "web/src/app-free.js",
];

const config = {
  edition: "free",
  version: VERSION,
  proUrl: process.env.PRO_URL || "",
  sample: fs.readFileSync(path.join(ROOT, "web/assets/sample-potion.png")).toString("base64"),
};

function safeScript(code, name) {
  if (/<\/script/i.test(code)) throw new Error(`${name} contains a closing script tag`);
  return `\n// ---- ${name} ----\n${code}`;
}

const scripts = [
  safeScript(`window.PIXEL_PROOFREADER_CONFIG = ${JSON.stringify(config)};`, "config"),
  ...SCRIPTS.map((p) => safeScript(read(p), p)),
].join("\n");

let html = read("web/src/index.html");
const fill = (key, value) => { html = html.split(`{{${key}}}`).join(value); };
fill("STYLES", read("web/src/styles.css"));
fill("VERSION", VERSION);
html = html.replace("{{SCRIPTS}}", () => scripts);
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error("unfilled template placeholder");

fs.mkdirSync(OUT, { recursive: true });
const indexPath = path.join(OUT, "index.html");
fs.writeFileSync(indexPath, html);

// Deterministic zip (fixed mtime, sorted names, no extra attributes).
const stage = fs.mkdtempSync(path.join(OUT, ".stage-"));
fs.copyFileSync(indexPath, path.join(stage, "index.html"));
fs.copyFileSync(path.join(ROOT, "web/FREE_README.txt"), path.join(stage, "README.txt"));
const names = ["README.txt", "index.html"];
for (const n of names) {
  fs.chmodSync(path.join(stage, n), 0o644);
  fs.utimesSync(path.join(stage, n), new Date("2000-01-01T00:00:00Z"), new Date("2000-01-01T00:00:00Z"));
}
const zipName = `pixel-proofreader-free-web-${VERSION}.zip`;
fs.rmSync(path.join(OUT, zipName), { force: true });
execFileSync("zip", ["-X", "-D", "-q", "-9", path.join(OUT, zipName), ...names], { cwd: stage, env: { ...process.env, TZ: "UTC" } });
fs.rmSync(stage, { recursive: true, force: true });
console.log(indexPath);
console.log(path.join(OUT, zipName));
