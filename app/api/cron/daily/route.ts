import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { buildAndSaveRecommendations } from "@/lib/match/build";
import { sendDailyDigest, parseSalaryMin } from "@/lib/email/send";
import type { JobRow } from "@/lib/email/template";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;

  const [totalInDb, newToday, mianyiCount] = await Promise.all([
    prisma.jd.count(),
    prisma.jd.count({ where: { crawledAt: { gte: today } } }),
    prisma.jd.count({ where: { crawledAt: { gte: today }, salaryRange: { contains: "面議" } } }),
  ]);

  const users = await prisma.user.findMany({
    where: { jobIntent: { isNot: null } },
    select: { id: true, email: true, jobIntent: { select: { rawInput: true } } },
  });

  let sent = 0;
  let failed = 0;

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  for (const user of users) {
    try {
      // 共用管線：match → boost → 去重 → LLM 精排 → 存推薦（cron 排除近 7 天已推薦過）
      const built = await buildAndSaveRecommendations(
        user.id,
        user.jobIntent?.rawInput ?? "",
        { excludeRecentDays: 7 }
      );
      if (built.length === 0) continue;

      // Build email jobs
      const jobs: JobRow[] = built.map((b) => ({
        title: b.jd.title,
        companyName: b.jd.companyName,
        industry: null,
        salaryMin: parseSalaryMin(b.jd.salaryRange),
        salaryRange: b.jd.salaryRange,
        location: b.jd.location,
        externalUrl: b.jd.externalUrl,
        recruitmentActivity: b.jd.recruitmentActivity,
        replyDays: b.jd.replyDays,
        contactTime: b.jd.contactTime,
        score: b.finalScore,
        postedAt: b.jd.postedAt,
        reasoning: b.reason,
        alignedSkills: b.alignedSkills,
        trackingUrl: b.trackingToken ? `${baseUrl}/api/track/click?token=${b.trackingToken}` : undefined,
      }));
      jobs.sort((a, b) => b.salaryMin - a.salaryMin || b.score - a.score);

      // email 只放精選前 10 筆（避免轟炸），其餘導到網站看全部
      const EMAIL_LIMIT = 10;

      await sendDailyDigest(user.email!, {
        date: dateStr,
        totalFetched: totalInDb,
        newToday,
        mianyiCount,
        updatedCount: 0,
        salaryChangedCount: 0,
        unchangedCount: totalInDb - newToday,
        delistedCount: 0,
        jobs: jobs.slice(0, EMAIL_LIMIT),
        totalCount: jobs.length,
        appUrl: baseUrl,
      });

      sent++;
    } catch (err) {
      console.error(`Cron failed for ${user.email}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, users: users.length });
}
