import { prisma } from "@/lib/db/client";
import { matchForUser, recencyBoost, competitionBoost } from "@/lib/match/score";
import { generateReasons } from "@/lib/match/reason";
import { sendDailyDigest, parseSalaryMin } from "@/lib/email/send";
import type { JobRow } from "@/lib/email/template";

export async function sendPreviewEmail(userId: string, email: string) {
  const matches = await matchForUser(userId, 20);
  if (matches.length === 0) return;

  const jdData = await prisma.jd.findMany({
    where: { id: { in: matches.map((m) => m.jdId) } },
    select: { id: true, title: true, companyName: true, salaryRange: true,
              location: true, externalUrl: true, recruitmentActivity: true, replyDays: true,
              contactTime: true, postedAt: true, applicantCount: true,
              skills: true, seniority: true },
  });
  const jdMap = Object.fromEntries(jdData.map((j) => [j.id, j]));

  const allBoosted = matches.map((m) => {
    const jd = jdMap[m.jdId];
    const boost = recencyBoost(jd?.postedAt ?? null) * competitionBoost(jd?.applicantCount ?? null);
    return { ...m, finalScore: m.finalScore * boost };
  }).sort((a, b) => b.finalScore - a.finalScore);

  const seen = new Set<string>();
  const top = allBoosted.filter((m) => {
    const company = jdMap[m.jdId]?.companyName ?? "";
    if (seen.has(company)) return false;
    seen.add(company);
    return true;
  }).slice(0, 10);

  const intent = await prisma.jobIntent.findUnique({ where: { userId }, select: { rawInput: true } });
  const reasons = await generateReasons(
    intent?.rawInput ?? "",
    top.map((m) => {
      const jd = jdMap[m.jdId]!;
      return { jdId: m.jdId, title: jd.title, companyName: jd.companyName,
               skills: (jd.skills as string[]) ?? [], seniority: jd.seniority ?? null };
    })
  );
  const reasonMap = Object.fromEntries(reasons.map((r) => [r.jdId, r]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = `${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`;

  const totalInDb = await prisma.jd.count();

  const jobs: JobRow[] = top.map((m) => {
    const jd = jdMap[m.jdId]!;
    const r = reasonMap[m.jdId];
    return {
      title: jd.title, companyName: jd.companyName, industry: null,
      salaryMin: parseSalaryMin(jd.salaryRange), salaryRange: jd.salaryRange,
      location: jd.location, externalUrl: jd.externalUrl,
      recruitmentActivity: jd.recruitmentActivity, replyDays: jd.replyDays,
      contactTime: jd.contactTime, score: m.finalScore, postedAt: jd.postedAt,
      reasoning: r?.reason ?? null, alignedSkills: r?.alignedSkills ?? [],
    };
  });
  jobs.sort((a, b) => b.salaryMin - a.salaryMin || b.score - a.score);

  await sendDailyDigest(email, {
    date: `${dateStr} Preview`,
    totalFetched: totalInDb,
    newToday: 0, mianyiCount: 0, updatedCount: 0,
    salaryChangedCount: 0, unchangedCount: totalInDb, delistedCount: 0,
    jobs,
  });
}
