import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-background-timer-throttling"],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on("pageerror", (e) => {
  errors.push(e.message);
  console.log("pageerror", e.message);
});

async function pump(n = 60) {
  await page.evaluate(async (frames) => {
    for (let i = 0; i < frames; i++) await new Promise((r) => requestAnimationFrame(r));
  }, n);
}

await page.goto("http://127.0.0.1:8080/", { waitUntil: "domcontentloaded" });
await page.waitForSelector("canvas");
await pump(70);
await page.locator("button").filter({ hasText: /^Earth$/ }).click({ force: true });
await page.waitForFunction(() => window.__orreryBridge?.selectedId === "earth");
await pump(80);

const info = await page.evaluate(() => ({
  overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  width: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
  hasPanel: document.body.innerText.includes("Terrestrial planet"),
  cam: window.__orreryCam,
  errors: 0,
}));
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: "/workspace/screenshots/mobile.png" });
await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
if (info.overflowX) throw new Error(`horizontal overflow ${info.width} > ${info.client}`);
if (!info.hasPanel) throw new Error("mobile info panel missing");
if ((info.cam?.dist ?? 99) > 16) throw new Error(`mobile cam not focused ${info.cam?.dist}`);
console.log("mobile OK");
