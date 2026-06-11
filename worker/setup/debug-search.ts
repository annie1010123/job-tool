import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "zh-TW",
  });
  const page = await context.newPage();

  // 收集所有 API requests
  const apiUrls: string[] = [];
  page.on("response", (resp) => {
    const url = resp.url();
    if (url.includes("104.com.tw") && !url.includes(".js") && !url.includes(".css") && !url.includes(".png") && !url.includes(".gif")) {
      apiUrls.push(`[${resp.status()}] ${url.slice(0, 120)}`);
    }
  });

  // Warm up
  await page.goto("https://www.104.com.tw", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  console.log("=== 首頁請求 ===");
  apiUrls.forEach(u => console.log(u));
  apiUrls.length = 0;

  // Search
  const searchUrl = "https://www.104.com.tw/jobs/search/?keyword=%E5%B0%88%E6%A1%88%E7%AE%A1%E7%90%86%E5%AF%A6%E7%BF%92&area=6001001000,6001002000&order=12&page=1";
  console.log("\n=== 搜尋請求 ===");
  await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(5000);
  apiUrls.forEach(u => console.log(u));

  await browser.close();
}
main().catch(console.error);
