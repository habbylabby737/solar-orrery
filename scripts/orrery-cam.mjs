import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
  ],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("pageerror", e.message);
});
page.on("console", (msg) => {
  if (msg.type() === "error") console.log("console.error", msg.text());
});

async function pump(frames = 90) {
  await page.evaluate(async (n) => {
    for (let i = 0; i < n; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, frames);
}

await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas");
await pump(90);
await page.evaluate(() => document.querySelector("vite-error-overlay")?.remove());

const overview = await page.evaluate(() => ({
  cam: window.__orreryCam,
  tick: window.__orreryTick ?? 0,
  selected: window.__orreryBridge?.selectedId ?? null,
  hasCanvas: !!document.querySelector("canvas"),
}));
console.log("overview", JSON.stringify(overview));
await page.screenshot({ path: "/workspace/screenshots/app-builder-preview.png" });

await page.locator("button").filter({ hasText: /^Earth$/ }).click({ force: true });
await page.waitForFunction(() => window.__orreryBridge?.selectedId === "earth");
await pump(120);

const focused = await page.evaluate(() => ({
  cam: window.__orreryCam,
  tick: window.__orreryTick ?? 0,
  selected: window.__orreryBridge?.selectedId ?? null,
  marked: document.documentElement.dataset.orrery ?? null,
  err: window.__orreryErr ?? null,
  blurb: document.body.innerText.includes("The only world known"),
}));
console.log("earth", JSON.stringify(focused));
await page.screenshot({ path: "/workspace/screenshots/focus-earth.png" });

await page.locator("button").filter({ hasText: /^Jupiter$/ }).click({ force: true });
await page.waitForFunction(() => window.__orreryBridge?.selectedId === "jupiter");
await pump(120);
const jup = await page.evaluate(() => ({
  cam: window.__orreryCam,
  tick: window.__orreryTick ?? 0,
  selected: window.__orreryBridge?.selectedId ?? null,
}));
console.log("jupiter", JSON.stringify(jup));
await page.screenshot({ path: "/workspace/screenshots/focus-jupiter.png" });

console.log("errors", errors);
await browser.close();

const dist = focused.cam?.dist ?? 999;
if (!focused.blurb) throw new Error("Earth info panel missing");
if (focused.selected !== "earth") throw new Error("Earth not selected");
if ((focused.tick ?? 0) < 20) throw new Error(`Camera loop stalled (tick=${focused.tick})`);
if (dist > 14) throw new Error(`Camera not close to Earth (dist=${dist})`);
if ((jup.cam?.dist ?? 999) > 30) throw new Error(`Camera not close to Jupiter (dist=${jup.cam?.dist})`);
console.log("camera-focus OK");
