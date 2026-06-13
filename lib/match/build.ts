import { prisma } from "../db/client";
import { matchForUser, recencyBoost, replyBoost, activityBoost, competitionBoost } from "./score";
import { generateReasons } from "./reason";

// 推薦精排參數（cron 與「編輯意圖即時重建」共用，確保兩邊行為一致）
const FIT_THRESHOLD = 4;   // LLM 適配分門檻
const MAX_RERANK = 30;     // 送 LLM 評分的上限（成本）
const MAX_RESULTS = 30;    // 最終推薦數上限（不固定數量，夠格的都收）
const POSTED_MAX_DAYS = 14; // 上架超過這天數的職缺不推薦（自動清久遠；postedAt 為空則保留）

/** 判斷職缺上架是否超過 N 天。postedAt 格式 "YYYY/MM/DD"；無法解析（含 "null"）視為未知 → 不排除 */
function isStalePosting(postedAt: string | null, maxDays: number): boolean {
  if (!postedAt || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(postedAt)) return false;
  const posted = new Date(postedAt.replace(/\//g, "-"));
  if (isNaN(posted.getTime())) return false;
  const ageDays = (Date.now() - posted.getTime()) / 86400000;
  return ageDays > maxDays;
}

export interface BuiltJob {
  jdId: string;
  jd: {
    id: string; title: string; companyName: string; salaryRange: string | null;
    location: string | null; externalUrl: string; recruitmentActivity: string | null;
    replyDays: string | null; contactTime: string | null; postedAt: string | null;
    applicantCount: number | null; skills: unknown; seniority: string | null;
  };
  resumeScore: number;
  intentScore: number;
  finalScore: number;
  reason: string | null;
  alignedSkills: string[];
  trackingToken: string;
}

/**
 * 共用推薦管線：match（召回）→ boost → 公司去重 → LLM fitScore 精排 → 過濾 → 存 Recommendation + EmailLog。
 * 寫入「今日批次」（先刪再建）。回傳已存推薦（含 email 需要的欄位與 trackingToken）。
 * @param excludeRecentDays 排除近 N 天已推薦過的職缺（cron 用 7 避免每日重複；即時重建用 0 顯示全部）。
 */
export async function buildAndSaveRecommendations(
  userId: string,
  intentRaw: string,
  opts: { excludeRecentDays?: number } = {}
): Promise<BuiltJob[]> {
  const { excludeRecentDays = 0 } = opts;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const matches = await matchForUser(userId, 40);
  if (matches.length === 0) {
    await prisma.recommendation.deleteMany({ where: { userId, dailyBatch: today } });
    return [];
  }

  const jdData = await prisma.jd.findMany({
    where: { id: { in: matches.map((m) => m.jdId) } },
    select: {
      id: true, title: true, companyName: true, salaryRange: true, location: true,
      externalUrl: true, recruitmentActivity: true, replyDays: true, contactTime: true,
      postedAt: true, applicantCount: true, skills: true, seniority: true,
    },
  });
  const jdMap = Object.fromEntries(jdData.map((j) => [j.id, j]));

  // 排除近 N 天已推薦過的（避免每日 email 重複）；excludeRecentDays=0 時不排除
  let recentJdIds = new Set<string>();
  if (excludeRecentDays > 0) {
    const since = new Date(today);
    since.setDate(since.getDate() - excludeRecentDays);
    const recent = await prisma.recommendation.findMany({
      where: { userId, dailyBatch: { gte: since, lt: today } },
      select: { jdId: true },
    });
    recentJdIds = new Set(recent.map((r) => r.jdId));
  }

  const allBoosted = matches
    .filter((m) => !recentJdIds.has(m.jdId))
    .filter((m) => !isStalePosting(jdMap[m.jdId]?.postedAt ?? null, POSTED_MAX_DAYS))
    .map((m) => {
      const jd = jdMap[m.jdId];
      const boost = recencyBoost(jd?.postedAt ?? null)
        * replyBoost(jd?.replyDays ?? null)
        * activityBoost(jd?.recruitmentActivity ?? null)
        * competitionBoost(jd?.applicantCount ?? null);
      return { ...m, finalScore: m.finalScore * boost };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  // 公司去重：每家最多 1 筆
  const seen = new Set<string>();
  const dedupedMatches = allBoosted.filter((m) => {
    const company = jdMap[m.jdId]?.companyName ?? "";
    if (seen.has(company)) return false;
    seen.add(company);
    return true;
  });

  // LLM fitScore 精排（embedding 召回、LLM 判職類）
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

  const finalMatches = rerankPool
    .filter((m) => (reasonMap[m.jdId]?.fitScore ?? 6) >= FIT_THRESHOLD)
    .sort((a, b) => {
      const fa = reasonMap[a.jdId]?.fitScore ?? 6;
      const fb = reasonMap[b.jdId]?.fitScore ?? 6;
      return fb !== fa ? fb - fa : b.finalScore - a.finalScore;
    })
    .slice(0, MAX_RESULTS);

  // 存「今日批次」：先刪再建 + EmailLog（點擊追蹤）
  await prisma.recommendation.deleteMany({ where: { userId, dailyBatch: today } });

  const built: BuiltJob[] = [];
  for (const m of finalMatches) {
    const r = reasonMap[m.jdId];
    const rec = await prisma.recommendation.create({
      data: {
        userId, jdId: m.jdId, resumeScore: m.resumeScore, intentScore: m.intentScore,
        finalScore: m.finalScore, dailyBatch: today,
        reasoning: r?.reason ?? null, alignedSkills: r?.alignedSkills ?? [],
      },
    });
    const log = await prisma.emailLog.create({
      data: { userId, recommendationId: rec.id, jdId: m.jdId },
    });
    built.push({
      jdId: m.jdId,
      jd: jdMap[m.jdId]!,
      resumeScore: m.resumeScore,
      intentScore: m.intentScore,
      finalScore: m.finalScore,
      reason: r?.reason ?? null,
      alignedSkills: r?.alignedSkills ?? [],
      trackingToken: log.trackingToken,
    });
  }

  return built;
}
