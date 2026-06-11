import { config } from "dotenv";
config({ path: ".env.local" });
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });

  console.log("▶ Loading search page...");
  await page.goto(
    "https://www.104.com.tw/jobs/search/?keyword=%E5%B0%88%E6%A1%88%E7%AE%A1%E7%90%86&area=6001001000%2C6001002000&order=12",
    { waitUntil: "domcontentloaded", timeout: 30000 }
  );

  // Wait a bit for JS to render
  await page.waitForTimeout(5000);

  console.log("Page title:", await page.title());

  // Try to find job links in the rendered HTML
  const jobLinks = await page.$$eval(
    "a[href*='/job/']",
    (els) => els.map((el) => el.getAttribute("href")).filter(Boolean)
  );

  console.log(`\nFound ${jobLinks.length} job links:`);
  jobLinks.slice(0, 10).forEach((l) => console.log(" ", l));

  // Also try data-* attributes
  const jobCards = await page.$$eval(
    "[data-job-no], [data-jobno]",
    (els) => els.map((el) => el.getAttribute("data-job-no") || el.getAttribute("data-jobno"))
  );
  console.log(`\nFound ${jobCards.length} job cards with data attributes`);

  // Get first 500 chars of body to see what's rendered
  const bodyText = await page.locator("body").innerText().catch(() => "");
  console.log("\nBody preview:", bodyText.slice(0, 300));

  await browser.close();
}

main().catch(console.error);
