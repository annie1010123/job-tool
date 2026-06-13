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
      const matches = await matchForUser(user.id, 40);
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
      const dedupedMatches = allBoosted.filter((m) => {
        const company = jdMap[m.jdId]?.companyName ?? "";
        if (seen.has(company)) return false;
        seen.add(company);
        return true;
      });

      // ── LLM 重排（精排）：對候選評 fitScore（職類適配度）+ 寫理由 ──
      // embedding 負責召回（廣度），LLM 負責精準判斷職類相符（殺掉「沾邊但職類不同」的職缺）
      const FIT_THRESHOLD = 5;
      const MAX_RERANK = 30;   // LLM 成本上限
      const MAX_RESULTS = 30;  // email/推薦數量上限（不固定每天 10 筆，夠格的都顯示）
      const intentRaw = user.jobIntent?.rawInput ?? "";
      const rerankPool = dedupedMatches.slice(0, MAX_RERANK);
      const reasons = await generateReasons(
        intentRaw,
        rerankPool.map((m) => {
          const jd = jdMap[m.jdId]!;
          return { jdId: m.jdId, title: jd.title, companyName: jd.companyName,
                   skills: (jd.skills as string[]) ?? [], seniority: jd.seniority ?? null };
        })
      );
      const reasonMap = Object.fromEntries(reasons.map((r) => [r.jdId, r]));

      // 過濾低適配 + 依 fitScore 重排（同分用 embedding finalScore）；不固定數量，夠格的都收
      const boostedMatches = rerankPool
        .filter((m) => (reasonMap[m.jdId]?.fitScore ?? 6) >= FIT_THRESHOLD)
        .sort((a, b) => {
          const fa = reasonMap[a.jdId]?.fitScore ?? 6;
          const fb = reasonMap[b.jdId]?.fitScore ?? 6;
          return fb !== fa ? fb - fa : b.finalScore - a.finalScore;
        })
        .slice(0, MAX_RESULTS);

      if (boostedMatches.length === 0) continue;

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
