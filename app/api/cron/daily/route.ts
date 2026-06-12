import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { matchForUser, recencyBoost, replyBoost, activityBoost, competitionBoost } from "@/lib/match/score";
import { generateReasons } from "@/lib/match/reason";
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

  for (const user of users) {
    try {
      const matches = await matchForUser(user.id, 30);
      if (matches.length === 0) continue;

      // Boost
      const jdData = await prisma.jd.findMany({
        where: { id: { in: matches.map((m) => m.jdId) } },
        select: { id: true, title: true, companyName: true, salaryRange: true,
                  location: true, externalUrl: true, recruitmentActivity: true, replyDays: true,
                  contactTime: true, postedAt: true, applicantCount: true,
                  skills: true, seniority: true },
      });
      const jdMap = Object.fromEntries(jdData.map((j) => [j.id, j]));

      // Exclude jobs recommended in the last 7 days
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRecs = await prisma.recommendation.findMany({
        where: { userId: user.id, dailyBatch: { gte: sevenDaysAgo, lt: today } },
        select: { jdId: true },
      });
      const recentJdIds = new Set(recentRecs.map((r) => r.jdId));

      const allBoosted = matches
        .filter((m) => !recentJdIds.has(m.jdId))
        .map((m) => {
          const jd = jdMap[m.jdId];
          const boost = recencyBoost(jd?.postedAt ?? null)
            * replyBoost(jd?.replyDays ?? null)
            * activityBoost(jd?.recruitmentActivity ?? null)
            * competitionBoost(jd?.applicantCount ?? null);
          return { ...m, finalScore: m.finalScore * boost };
        }).sort((a, b) => b.finalScore - a.finalScore);

      // Diversity guardrail: max 1 JD per company
      const seen = new Set<string>();
      const boostedMatches = allBoosted.filter((m) => {
        const company = jdMap[m.jdId]?.companyName ?? "";
        if (seen.has(company)) return false;
        seen.add(company);
        return true;
      }).slice(0, 10);

      // Generate reasoning
      const intentRaw = user.jobIntent?.rawInput ?? "";
      const reasons = await generateReasons(
        intentRaw,
        boostedMatches.map((m) => {
          const jd = jdMap[m.jdId]!;
          return { jdId: m.jdId, title: jd.title, companyName: jd.companyName,
                   skills: (jd.skills as string[]) ?? [], seniority: jd.seniority ?? null };
        })
      );
      const reasonMap = Object.fromEntries(reasons.map((r) => [r.jdId, r]));

      // Save recommendations + create EmailLog for click tracking
      await prisma.recommendation.deleteMany({ where: { userId: user.id, dailyBatch: today } });
      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      const savedRecs: Array<{ id: string; jdId: string; trackingToken: string }> = [];

      for (const match of boostedMatches) {
        const r = reasonMap[match.jdId];
        const rec = await prisma.recommendation.create({
          data: { userId: user.id, jdId: match.jdId, resumeScore: match.resumeScore,
                  intentScore: match.intentScore, finalScore: match.finalScore, dailyBatch: today,
                  reasoning: r?.reason ?? null, alignedSkills: r?.alignedSkills ?? [] },
        });
        const log = await prisma.emailLog.create({
          data: { userId: user.id, recommendationId: rec.id, jdId: match.jdId },
        });
        savedRecs.push({ id: rec.id, jdId: match.jdId, trackingToken: log.trackingToken });
      }
      const trackingMap = Object.fromEntries(savedRecs.map((r) => [r.jdId, r.trackingToken]));

      // Build email jobs
      const jobs: JobRow[] = boostedMatches.map((m) => {
        const jd = jdMap[m.jdId]!;
        const r = reasonMap[m.jdId];
        const token = trackingMap[m.jdId];
        return {
          title: jd.title,
          companyName: jd.companyName,
          industry: null,
          salaryMin: parseSalaryMin(jd.salaryRange),
          salaryRange: jd.salaryRange,
          location: jd.location,
          externalUrl: jd.externalUrl,
          recruitmentActivity: jd.recruitmentActivity,
          replyDays: jd.replyDays,
          contactTime: jd.contactTime,
          score: m.finalScore,
          postedAt: jd.postedAt,
          reasoning: r?.reason ?? null,
          alignedSkills: r?.alignedSkills ?? [],
          trackingUrl: token ? `${baseUrl}/api/track/click?token=${token}` : undefined,
        };
      });
      jobs.sort((a, b) => b.salaryMin - a.salaryMin || b.score - a.score);

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

      sent++;
    } catch (err) {
      console.error(`Cron failed for ${user.email}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, users: users.length });
}
