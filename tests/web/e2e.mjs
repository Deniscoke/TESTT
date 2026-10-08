// End-to-end test of the built Free edition in a real browser, opened from
// file:// with every network request blocked and recorded.
// Browser selection (no downloads):
//   PP_BROWSER_CHANNEL=msedge|chrome   (installed browser, e.g. on CI runners)
//   PP_CHROMIUM_PATH=/path/to/chrome   (explicit executable)
// Optional: PP_SCREENSHOTS=<dir> saves documentation screenshots.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const html = path.join(ROOT, "dist/web/free/index.html");
if (!fs.existsSync(html)) { console.error("Build first: node tools/build_web.mjs"); process.exit(2); }

const launch = { headless: true };
if (process.env.PP_BROWSER_CHANNEL) launch.channel = process.env.PP_BROWSER_CHANNEL;
else if (process.env.PP_CHROMIUM_PATH) launch.executablePath = process.env.PP_CHROMIUM_PATH;
else launch.channel = "chrome";

const shots = process.env.PP_SCREENSHOTS;
const browser = await chromium.launch(launch);
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const network = [];
await context.route("**/*", (route) => {
  const url = route.request().url();
  if (url.startsWith("file:") || url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
  network.push(url);
  return route.abort();
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const eq = (a, b, m) => { if (a !== b) throw new Error(`${m}: expected ${b}, got ${a}`); };
const text = (sel) => page.locator(sel).innerText();
const fixture = (n) => path.join(ROOT, "tests/web/png-fixtures", n);

test("opens offline from file:// with the drop zone", async () => {
  await page.goto(pathToFileURL(html).href);
  eq(await page.title(), "Pixel Proofreader Free", "title");
  eq(await page.locator("#dropzone").isVisible(), true, "drop zone");
  if (shots) await page.screenshot({ path: path.join(shots, "free-start.png") });
});

test("sample sprite shows counts, summary and a painted canvas", async () => {
  await page.click("#sampleBtn");
  await page.waitForSelector("#workspace:not([hidden])");
  const counts = await page.locator(".rule .count").allInnerTexts();
  eq(counts.join(","), "3,5,3", "rule counts");
  eq((await text("#summary")).includes("pixels to review"), true, "summary");
  const painted = await page.evaluate(() => {
    const c = document.getElementById("canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  });
  if (painted < 1000) throw new Error("canvas looks empty");
});

test("hover shows pixel information", async () => {
  const box = await page.locator("#canvas").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const s = await text("#statusbar");
  if (!/x \d+, y \d+/.test(s)) throw new Error("status: " + s);
  if (shots) await page.screenshot({ path: path.join(shots, "free-results.png") });
});

test("zoom controls and overlay toggle work", async () => {
  const before = await text("#zoomLabel");
  await page.click("#zoomIn");
  if ((await text("#zoomLabel")) === before) throw new Error("zoom did not change");
  await page.click("#fitBtn");
  await page.click("#overlayToggle");
  await page.click("#overlayToggle");
  await page.locator(".rule input").first().uncheck();
  await page.locator(".rule input").first().check();
});

test("skip-isolated option re-runs the analysis", async () => {
  await page.check("#skipIsolated");
  const first = (await page.locator(".rule .count").allInnerTexts())[0];
  await page.uncheck("#skipIsolated");
  if (Number(first) > 3) throw new Error("unexpected orphan count " + first);
});

test("opening another PNG via the file picker", async () => {
  await page.setInputFiles("#fileInput2", fixture("indexed8_trns.png"));
  await page.waitForFunction(() => document.getElementById("fileName").textContent === "indexed8_trns.png");
  eq((await text("#fileMeta")).startsWith("13 × 9 px"), true, "meta");
});

test("malformed PNG shows a friendly error and keeps the app usable", async () => {
  const bad = path.join(ROOT, "dist/web/broken.png");
  fs.writeFileSync(bad, Buffer.from("this is not a png"));
  await page.setInputFiles("#fileInput2", bad);
  await page.waitForSelector("#error:not([hidden])");
  eq((await text("#error")).includes("Not a PNG"), true, "error text");
  eq(await text("#fileName"), "indexed8_trns.png", "previous image kept");
});

test("Pro card is honest when no store URL is configured", async () => {
  eq(await page.locator("#proLink").getAttribute("aria-disabled"), "true", "disabled");
  eq((await text("#proNote")).includes("not released yet"), true, "note");
});

test("privacy dialog opens", async () => {
  await page.click("#privacyBtn");
  eq(await page.locator("#privacyDialog").isVisible(), true, "dialog");
  await page.keyboard.press("Escape");
});

test("mobile layout has no horizontal scroll", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (over > 0) throw new Error("horizontal overflow " + over + "px");
  if (shots) await page.screenshot({ path: path.join(shots, "free-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
});

test("no network requests and no page errors", async () => {
  eq(network.length, 0, "network requests: " + network.join(", "));
  eq(errors.length, 0, "page errors: " + errors.join(" | "));
});

let passed = 0, failed = 0;
for (const [name, fn] of tests) {
  try { await fn(); passed++; } catch (e) { failed++; console.log(`FAIL ${name}\n    ${e.message}`); }
}
console.log(`browser: ${browser.version()}`);
console.log(`${passed} passed, ${failed} failed, 0 skipped`);
await browser.close();
process.exit(failed ? 1 : 0);
