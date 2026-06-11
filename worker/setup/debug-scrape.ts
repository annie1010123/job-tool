import { config } from "dotenv";
config({ path: ".env.local" });
import { chromium } from "playwright";
import { prisma } from "../../lib/db/client";
import { scrapeJob } from "../../lib/crawler/crawl";

async function main() {
  const jds = await prisma.jd.findMany({
    where: { description: null },
    select: { id: true, externalUrl: true, title: true },
    take: 5,
  });

  const browser = await chromium.launch({ headless: false }); // visible for debug
  const context = await browser.newContext({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" });
  const page = await context.newPage();

  for (const jd of jds) {
    const match = jd.externalUrl.match(/\/job\/([a-zA-Z0-9]+)/);
    if (!match) { console.log(`❌ URL parse fail: ${jd.externalUrl}`); continue; }

    console.log(`\n▶ ${jd.title} (${match[1]})`);
    const result = await scrapeJob(page, match[1]);
    if (!result) {
      // Check what the page actually shows
      const pageTitle = await page.title().catch(() => "?");
      const bodyText = await page.locator("body").innerText().catch(() => "").then(t => t.slice(0, 100));
      console.log(`  ❌ null — page title: "${pageTitle}"`);
      console.log(`  body: ${bodyText}`);
    } else {
      console.log(`  ✅ desc: ${result.description?.slice(0, 80) ?? "empty"}`);
    }
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
  await prisma.$disconnect();
}
main().catch(console.error);
