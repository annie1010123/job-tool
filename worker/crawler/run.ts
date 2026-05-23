import { config } from "dotenv";
config({ path: ".env.local" });

import { chromium } from "playwright";
import { prisma } from "../../lib/db/client";
import { fetchJobNos, scrapeJob } from "../../lib/crawler/crawl";
import { embedJd } from "../../lib/jd/embed";

const PAGES_PER_KEYWORD = 3;
const DELAY_MS = 8000;

async function main() {
  console.log("🚀 JobPilot 104 Production Crawler\n");

  // 1. 收集所有使用者的關鍵字
  const intents = await prisma.jobIntent.findMany({
    select: { expandedKeywords: true },
  });
  const allKeywords = [
    ...new Set(intents.flatMap((i) => i.expandedKeywords as string[])),
  ];

  console.log(`關鍵字 ${allKeywords.length} 個: ${allKeywords.join(", ")}`);
  if (allKeywords.length === 0) {
    console.log("沒有關鍵字，結束");
    await prisma.$disconnect();
    return;
  }

  // 2. 啟動 Chrome
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ??
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--headless=new",
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
    ],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "zh-TW",
    extraHTTPHeaders: { "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" },
  });

  // 3. 搜尋每個關鍵字，收集 job nos
  console.log("\n── 搜尋職缺清單 ──");
  let allJobNos: string[] = [];
  for (const kw of allKeywords) {
    const nos = await fetchJobNos(context, kw, PAGES_PER_KEYWORD);
    console.log(`  "${kw}": ${nos.length} 筆`);
    allJobNos.push(...nos);
  }
  allJobNos = [...new Set(allJobNos)];
  console.log(`\n總計 ${allJobNos.length} 個不重複職缺`);

  // 4. 過濾已存在的 JD
  const existing = await prisma.jd.findMany({ select: { externalUrl: true } });
  const existingUrls = new Set(existing.map((j) => j.externalUrl));
  const newJobNos = allJobNos.filter(
    (no) => !existingUrls.has(`https://www.104.com.tw/job/${no}`)
  );
  console.log(
    `新職缺 ${newJobNos.length} 個（跳過已存 ${allJobNos.length - newJobNos.length} 個）\n`
  );

  if (newJobNos.length === 0) {
    await browser.close();
    await prisma.$disconnect();
    console.log("沒有新職缺，結束");
    return;
  }

  // 5. 逐一爬取並儲存
  const page = await context.newPage();
  let saved = 0;
  let failed = 0;

  for (let i = 0; i < newJobNos.length; i++) {
    const jobNo = newJobNos[i];
    process.stdout.write(`[${i + 1}/${newJobNos.length}] ${jobNo} ... `);

    const job = await scrapeJob(page, jobNo);
    if (!job) {
      console.log("❌ 爬取失敗");
      failed++;
      continue;
    }

    try {
      const jd = await prisma.jd.upsert({
        where: { externalUrl: job.externalUrl },
        update: {
          title: job.title,
          companyName: job.companyName,
          skills: job.skills,
          salaryRange: job.salaryRange ?? null,
          seniority: job.seniority ?? null,
          remote: job.remote,
          location: job.location ?? null,
          recruitmentActivity: job.recruitmentActivity ?? null,
          replyDays: job.replyDays ?? null,
          contactTime: job.contactTime ?? null,
          postedAt: job.postedAt ?? null,
          applicantCount: job.applicantCount ?? null,
          crawledAt: new Date(),
        },
        create: {
          externalUrl: job.externalUrl,
          title: job.title,
          companyName: job.companyName,
          skills: job.skills,
          salaryRange: job.salaryRange ?? null,
          seniority: job.seniority ?? null,
          remote: job.remote,
          location: job.location ?? null,
          recruitmentActivity: job.recruitmentActivity ?? null,
          replyDays: job.replyDays ?? null,
          contactTime: job.contactTime ?? null,
          postedAt: job.postedAt ?? null,
          applicantCount: job.applicantCount ?? null,
        },
      });

      const vector = await embedJd(job);
      if (vector.length === 768) {
        await prisma.$executeRaw`
          INSERT INTO "JdEmbedding" ("jdId", "embedding")
          VALUES (${jd.id}, ${`[${vector.join(",")}]`}::vector(768))
          ON CONFLICT ("jdId") DO UPDATE SET "embedding" = EXCLUDED."embedding"
        `;
      }

      saved++;
      console.log(`✅ ${job.title} @ ${job.companyName}`);
    } catch (err) {
      console.log(`❌ DB 錯誤: ${String(err).slice(0, 100)}`);
      failed++;
    }

    if (i < newJobNos.length - 1) await sleep(DELAY_MS);
  }

  await browser.close();
  await prisma.$disconnect();

  console.log(`\n── 完成 ──`);
  console.log(`✅ 儲存: ${saved} 個`);
  console.log(`❌ 失敗: ${failed} 個`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
