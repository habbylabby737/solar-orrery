import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const errors = [];
async function run(name, viewport, fn) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`${name} console: ${m.text()}`);
  });
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);
  await fn(page);
  await page.close();
}

await run("desktop-earth", { width: 1280, height: 800 }, async (page) => {
  await page.getByRole("button", { name: "Earth" }).click();
  await page.waitForTimeout(1400);
  const panel = await page.getByText("Terrestrial planet").count();
  const blurb = await page.getByText("The only world known").count();
  await page.screenshot({ path: "/workspace/screenshots/focus-earth.png" });
  console.log("earth panel", panel, "blurb", blurb);
  await page.getByRole("button", { name: "Pause" }).first().click();
  await page.waitForTimeout(300);
  const resume = await page.getByRole("button", { name: "Resume" }).count();
  console.log("paused resume buttons", resume);
  await page.getByRole("button", { name: "Jupiter" }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: "/workspace/screenshots/focus-jupiter.png" });
  const jup = await page.getByText("Gas giant").count();
  console.log("jupiter panel", jup);
});

await run("mobile", { width: 390, height: 844 }, async (page) => {
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => {
    return {
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    };
  });
  await page.getByRole("button", { name: "Mars" }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: "/workspace/screenshots/mobile.png" });
  console.log("mobile overflow", overflow);
});

await browser.close();
console.log("errors", errors);
if (errors.length) process.exit(2);
