import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../../lib/db/client";
import { matchForUser, recencyBoost, competitionBoost } from "../../lib/match/score";

async function main() {
  console.log("🎯 JobPilot Match Runner\n");

  const dailyBatch = new Date();
  dailyBatch.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    where: { jobIntent: { isNot: null } },
    select: { id: true, email: true },
  });

  console.log(`${users.length} 個用戶需要配對\n`);

  for (const user of users) {
    console.log(`▶ ${user.email}`);

    const matches = await matchForUser(user.id, 10);

    if (matches.length === 0) {
      console.log("  ⚠️ 沒有 embedding，跳過");
      continue;
    }

    // 清掉今天舊的推薦，重新寫入
    await prisma.recommendation.deleteMany({
      where: { userId: user.id, dailyBatch },
    });

    // 取得 JD 資料（boost 計算 + 顯示用）
    const jdData = await prisma.jd.findMany({
      where: { id: { in: matches.map((m) => m.jdId) } },
      select: { id: true, title: true, companyName: true, postedAt: true, applicantCount: true },
    });
    const jdMap = Object.fromEntries(jdData.map((j) => [j.id, j]));

    const boostedMatches = matches.map((m) => {
      const jd = jdMap[m.jdId];
      const boost = recencyBoost(jd?.postedAt ?? null) * competitionBoost(jd?.applicantCount ?? null);
      return { ...m, finalScore: m.finalScore * boost };
    }).sort((a, b) => b.finalScore - a.finalScore);

    for (const match of boostedMatches) {
      await prisma.recommendation.upsert({
        where: { userId_jdId_dailyBatch: { userId: user.id, jdId: match.jdId, dailyBatch } },
        update: { resumeScore: match.resumeScore, intentScore: match.intentScore, finalScore: match.finalScore },
        create: { userId: user.id, jdId: match.jdId, resumeScore: match.resumeScore, intentScore: match.intentScore, finalScore: match.finalScore, dailyBatch },
      });
    }

    for (const match of boostedMatches.slice(0, 3)) {
      const jd = jdMap[match.jdId];
      if (jd) console.log(`  [${match.finalScore.toFixed(3)}] ${jd.title} @ ${jd.companyName}`);
    }
    console.log(`  ✅ 儲存 ${matches.length} 筆推薦`);
  }

  await prisma.$disconnect();
  console.log("\n✅ Match 完成");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
