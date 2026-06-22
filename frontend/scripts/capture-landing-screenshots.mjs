import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "../../docs/screenshots/landing");
const BASE_URL = process.env.LANDING_SCREENSHOT_BASE_URL ?? "http://localhost:3100";
const VIEWPORT = { width: 1440, height: 900 };

const SECTIONS = [
  { name: "01-home-full", path: "/", fullPage: true },
  { name: "02-hero", path: "/", selector: "main > section:nth-of-type(1)" },
  { name: "03-stats", path: "/", selector: "main > section:nth-of-type(2)" },
  { name: "04-features", path: "/#features", selector: "#features" },
  { name: "05-how-it-works", path: "/", selector: "main > section:nth-of-type(4)" },
  { name: "06-pricing", path: "/#pricing", selector: "#pricing" },
  { name: "07-reviews", path: "/#reviews", selector: "#reviews" },
  { name: "08-about-final-cta", path: "/#about", selector: "#about" },
  { name: "09-login-full", path: "/login", fullPage: true },
];

async function capture(page, item) {
  const url = `${BASE_URL}${item.path}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2500);

  const output = path.join(OUT_DIR, `${item.name}.png`);

  if (item.fullPage) {
    await page.screenshot({ path: output, fullPage: true });
    return;
  }

  const target = page.locator(item.selector).first();
  await target.waitFor({ state: "visible", timeout: 30_000 });
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await target.screenshot({ path: output });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const item of SECTIONS) {
    console.log(`Capturing ${item.name}...`);
    await capture(page, item);
  }

  await browser.close();
  console.log(`Saved ${SECTIONS.length} screenshots to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
