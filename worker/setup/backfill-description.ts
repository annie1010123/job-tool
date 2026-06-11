import { config } from "dotenv";
config({ path: ".env.local" });
import { chromium } from "playwright";
import { prisma } from "../../lib/db/client";
import { scrapeJob } from "../../lib/crawler/crawl";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Simulate human browsing cadence
function humanDelay(): number {
  const r = Math.random();
  if (r < 0.10) return 3000  + Math.random() * 5000;   // 10%: quick skim (3–8s)
  if (r < 0.80) return 12000 + Math.random() * 18000;  // 70%: normal read (12–30s)
  return 40000 + Math.random() * 50000;                 // 20%: long pause (40–90s)
}

// Simulate human scroll on the current page
async function humanScroll(page: import("playwright").Page) {
  const scrolls = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < scrolls; i++) {
    const distance = 200 + Math.random() * 400;
    await page.mouse.wheel(0, distance);
    await sleep(400 + Math.random() * 600);
  }
}

async function main() {
  const jds = await prisma.jd.findMany({
    where: { description: null },
    select: { id: true, externalUrl: true, title: true },
    orderBy: { crawledAt: "desc" },
  });

  console.log(`補抓 description：${jds.length} 筆\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
  });
  const page = await context.newPage();

  let done = 0;
  let failed = 0;
  let blocked = 0;

  for (let i = 0; i < jds.length; i++) {
    const jd = jds[i];
    const match = jd.externalUrl.match(/\/job\/([a-zA-Z0-9]+)/);
    if (!match) { failed++; continue; }

    try {
      const scraped = await scrapeJob(page, match[1]);

      // Detect Cloudflare block
      const pageTitle = await page.title().catch(() => "");
      if (pageTitle.includes("請稍候") || pageTitle.includes("Checking")) {
        blocked++;
        console.log(`  ⛔ Cloudflare block (${blocked} 次)，等 90 秒...`);
        await sleep(90000);
        // Retry once with fresh context
        await context.clearCookies();
        const retried = await scrapeJob(page, match[1]);
        if (retried?.description) {
          await prisma.jd.update({ where: { id: jd.id }, data: { description: retried.description } });
          done++;
        } else {
          failed++;
        }
        continue;
      }

      if (scraped?.description) {
        await humanScroll(page);
        await prisma.jd.update({ where: { id: jd.id }, data: { description: scraped.description } });
        done++;
        if (done % 10 === 0) console.log(`  ✅ ${done}/${jds.length} 完成（失敗 ${failed}，block ${blocked}）`);
      } else {
        failed++;
      }
    } catch (e) {
      console.error(`  ❌ ${jd.title}:`, (e as Error).message?.slice(0, 60));
      failed++;
    }

    const delay = humanDelay();
    await sleep(delay);
  }

  await browser.close();
  await prisma.$disconnect();
  console.log(`\n✅ 完成 ${done} 筆，失敗 ${failed} 筆，block ${blocked} 次`);
}

main().catch((e) => { console.error(e); process.exit(1); });
