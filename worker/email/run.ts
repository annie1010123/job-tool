import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../../lib/db/client";
import { sendDailyDigest, parseSalaryMin } from "../../lib/email/send";
import type { JobRow } from "../../lib/email/template";

async function main() {
  console.log("📧 JobPilot Email Runner\n");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;

  // DB stats
  const [totalInDb, newToday] = await Promise.all([
    prisma.jd.count(),
    prisma.jd.count({ where: { crawledAt: { gte: today } } }),
  ]);
  const mianyiCount = await prisma.jd.count({
    where: { crawledAt: { gte: today }, salaryRange: { contains: "面議" } },
  });

  console.log(`職缺庫: ${totalInDb} 筆，今日新增: ${newToday} 筆（面議: ${mianyiCount}）\n`);

  // Users with recommendations today
  const users = await prisma.user.findMany({
    where: {
      recommendations: { some: { dailyBatch: today } },
    },
    select: { id: true, email: true },
  });

  console.log(`${users.length} 個用戶需要寄信\n`);

  for (const user of users) {
    const recs = await prisma.recommendation.findMany({
      where: { userId: user.id, dailyBatch: today },
      orderBy: { finalScore: "desc" },
      take: 10,
      include: { jd: true },
    });

    const jobs: JobRow[] = recs.map((r) => ({
      title: r.jd.title,
      companyName: r.jd.companyName,
      industry: null, // TODO: crawl from 104
      salaryMin: parseSalaryMin(r.jd.salaryRange),
      salaryRange: r.jd.salaryRange,
      location: r.jd.location,
      externalUrl: r.jd.externalUrl,
      recruitmentActivity: r.jd.recruitmentActivity,
      replyDays: r.jd.replyDays,
      contactTime: r.jd.contactTime,
      score: r.finalScore,
      postedAt: r.jd.postedAt,
      reasoning: r.reasoning ?? null,
      alignedSkills: (r.alignedSkills as string[]) ?? [],
    }));

    // Sort by salary min desc, then score
    jobs.sort((a, b) => b.salaryMin - a.salaryMin || b.score - a.score);

    try {
      await sendDailyDigest(user.email!, {
        date: dateStr,
        totalFetched: totalInDb,
        newToday,
        mianyiCount,
        updatedCount: 0,
        salaryChangedCount: 0,
        unchangedCount: totalInDb - newToday,
        delistedCount: 0,
        jobs,
      });
      console.log(`✅ 已寄給 ${user.email}`);
    } catch (err) {
      console.log(`❌ 寄信失敗 ${user.email}: ${String(err).slice(0, 100)}`);
    }
  }

  await prisma.$disconnect();
  console.log("\n✅ Email 完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
