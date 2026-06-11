import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "playwright";
import { prisma } from "../../lib/db/client";

const TARGET_JOBS = [
  { url: "https://www.104.com.tw/job/8486f", id: "cmpfwf5tr0018gxw5hy6o57bs" },  // 台灣趨勢研究
  { url: "https://www.104.com.tw/job/90a2q", id: "cmpftuvh70001x5w5c9j06r6s" },  // 昇恆昌 (already done but verify)
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "zh-TW",
  });
  const page = await context.newPage();

  for (const { url, id } of TARGET_JOBS) {
    console.log(`\n→ ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(4000);
    const title = await page.title();
    console.log("  title:", title);
    const desc = await page.$eval("div.job-description", (el) => el.textContent?.trim() ?? "").catch(() => "");
    console.log("  desc length:", desc.length, "| preview:", desc.slice(0, 80));
    if (desc.length > 20) {
      await prisma.jd.update({ where: { id }, data: { description: desc } });
      console.log("  ✅ saved");
    } else {
      console.log("  ⚠️  skipped (too short)");
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
  await prisma.$disconnect();
}
main().catch(console.error);
