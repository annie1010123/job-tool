import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../../lib/db/client";
import { fetchJobNosApi, fetchJobDetailApi, closeCrawlerSession } from "../../lib/crawler/api";
import { embedJd } from "../../lib/jd/embed";
import type { ScrapedJob } from "../../lib/crawler/crawl";

const PAGES_PER_KEYWORD = 3;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function main() {
  console.log("🚀 JobPilot 104 Crawler (API mode)\n");

  // 1. 收集所有使用者的關鍵字
  const intents = await prisma.jobIntent.findMany({
    select: { expandedKeywords: true },
  });
  const allKeywords = [...new Set(intents.flatMap((i) => i.expandedKeywords as string[]))];

  console.log(`關鍵字 ${allKeywords.length} 個: ${allKeywords.join(", ")}`);
  if (allKeywords.length === 0) {
    console.log("沒有關鍵字，結束");
    await prisma.$disconnect();
    return;
  }

  // 2. 搜尋每個關鍵字，收集 job nos（翻頁早停：只抓今天）
  console.log("\n── 搜尋職缺清單 ──");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 1); // 只抓昨天之後的
  cutoff.setHours(0, 0, 0, 0);

  let allJobNos: string[] = [];
  for (const kw of allKeywords) {
    const nos = await fetchJobNosApi(kw, PAGES_PER_KEYWORD, cutoff);
    console.log(`  "${kw}": ${nos.length} 筆`);
    allJobNos.push(...nos);
    await sleep(800 + Math.random() * 600);
  }
  allJobNos = [...new Set(allJobNos)];
  console.log(`\n總計 ${allJobNos.length} 個不重複職缺`);

  // 3. 過濾已存在的 JD
  const existing = await prisma.jd.findMany({ select: { externalUrl: true } });
  const existingUrls = new Set(existing.map((j) => j.externalUrl));
  const newJobNos = allJobNos.filter(
    (no) => !existingUrls.has(`https://www.104.com.tw/job/${no}`)
  );
  console.log(`新職缺 ${newJobNos.length} 個（跳過已存 ${allJobNos.length - newJobNos.length} 個）\n`);

  if (newJobNos.length === 0) {
    await prisma.$disconnect();
    console.log("沒有新職缺，結束");
    return;
  }

  // 4. 逐一打 detail API 並儲存
  console.log("── 抓取職缺詳情 ──");
  let saved = 0;
  let failed = 0;

  for (let i = 0; i < newJobNos.length; i++) {
    const jobNo = newJobNos[i];
    process.stdout.write(`[${i + 1}/${newJobNos.length}] ${jobNo} ... `);

    const job = await fetchJobDetailApi(jobNo);
    if (!job) {
      console.log("❌ API 失敗");
      failed++;
      continue;
    }

    try {
      // ApiJob is compatible with ScrapedJob for embedding
      const jd = await prisma.jd.upsert({
        where: { externalUrl: job.externalUrl },
        update: {
          title: job.title, companyName: job.companyName, skills: job.skills,
          salaryRange: job.salaryRange, seniority: job.seniority, remote: job.remote,
          location: job.location, description: job.description,
          recruitmentActivity: job.recruitmentActivity, replyDays: job.replyDays,
          contactTime: job.contactTime, postedAt: job.postedAt,
          applicantCount: job.applicantCount, crawledAt: new Date(),
        },
        create: {
          externalUrl: job.externalUrl, title: job.title, companyName: job.companyName,
          skills: job.skills, salaryRange: job.salaryRange, seniority: job.seniority,
          remote: job.remote, location: job.location, description: job.description,
          recruitmentActivity: job.recruitmentActivity, replyDays: job.replyDays,
          contactTime: job.contactTime, postedAt: job.postedAt,
          applicantCount: job.applicantCount,
        },
      });

      const scrapedForEmbed: ScrapedJob = {
        jobNo,
        externalUrl: job.externalUrl,
        title: job.title,
        companyName: job.companyName,
        salaryRange: job.salaryRange ?? undefined,
        location: job.location ?? undefined,
        skills: job.skills,
        description: job.description ?? undefined,
        recruitmentActivity: job.recruitmentActivity ?? undefined,
        replyDays: job.replyDays ?? undefined,
        contactTime: job.contactTime ?? undefined,
        postedAt: job.postedAt ?? undefined,
        applicantCount: job.applicantCount ?? undefined,
        remote: job.remote,
        seniority: job.seniority ?? undefined,
      };
      const vector = await embedJd(scrapedForEmbed);
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
      console.log(`❌ DB 錯誤: ${String(err).slice(0, 80)}`);
      failed++;
    }
  }

  await closeCrawlerSession();
  await prisma.$disconnect();
  console.log(`\n── 完成 ──`);
  console.log(`✅ 儲存: ${saved} 個`);
  console.log(`❌ 失敗: ${failed} 個`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
