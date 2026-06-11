import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "playwright";

const urls = [
  "https://www.104.com.tw/job/8486f",  // 台灣趨勢研究
  "https://www.104.com.tw/job/7iij8",  // 優聖系統
  "https://www.104.com.tw/job/83rxa",  // 巧禾數位
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "zh-TW",
  });
  const page = await context.newPage();

  for (const url of urls) {
    console.log(`\n--- ${url} ---`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(3000);
    const title = await page.title();
    console.log("page title:", title);
    const desc = await page.$eval("div.job-description", (el) => el.textContent?.trim() ?? "").catch(() => "NOT FOUND");
    console.log("div.job-description:", desc.slice(0, 150));
  }

  await browser.close();
}
main().catch(console.error);
