import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "playwright";
import { prisma } from "../../lib/db/client";

async function scrapeDescription(page: import("playwright").Page, url: string): Promise<string | null> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2000);
  return page.$eval("div.job-description", (el) => el.textContent?.trim() ?? "").catch(() => null);
}

async function main() {
  // 優先補使用者有 Application 的 JD，再補其他
  const jds = await prisma.jd.findMany({
    where: {
      description: null,
      source: { not: "manual" },
      externalUrl: { startsWith: "http" },
      applications: { some: {} },
    },
    select: { id: true, externalUrl: true, title: true },
    orderBy: { crawledAt: "asc" },
    take: 50,
  });
  console.log(`補抓 description：${jds.length} 筆`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
  });
  const page = await context.newPage();
  let done = 0, failed = 0;

  for (const jd of jds) {
    if (!jd.externalUrl.startsWith("http")) { failed++; continue; }
    try {
      const desc = await scrapeDescription(page, jd.externalUrl);
      if (desc && desc.length > 20) {
        await prisma.jd.update({ where: { id: jd.id }, data: { description: desc } });
        console.log(`✅ ${jd.title}: ${desc.length} chars`);
        done++;
      } else {
        console.log(`⚠️  ${jd.title}: no description`);
        failed++;
      }
    } catch (e) {
      console.error(`❌ ${jd.title}:`, (e as Error).message?.slice(0, 60));
      failed++;
    }
    await new Promise(r => setTimeout(r, 2500));
  }

  await browser.close();
  await prisma.$disconnect();
  console.log(`\n完成 ${done} 筆，失敗 ${failed} 筆`);
}
main().catch((e) => { console.error(e); process.exit(1); });
