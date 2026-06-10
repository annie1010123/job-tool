import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";

export interface MatchResult {
  jdId: string;
  resumeScore: number;
  intentScore: number;
  keywordScore: number;
  finalScore: number;
}

export function recencyBoost(postedAt: string | null): number {
  if (!postedAt) return 1.0;
  const [month, day] = postedAt.split("/").map(Number);
  if (!month || !day) return 1.0;
  const today = new Date();
  const posted = new Date(today.getFullYear(), month - 1, day);
  // Handle year rollover (e.g., posting from Dec shown in Jan)
  if (posted > today) posted.setFullYear(today.getFullYear() - 1);
  const days = Math.floor((today.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24));
  // Exponential decay: 1 + 0.15 * e^(-days/4)
  // day 0 → ×1.15, day 1 → ×1.12, day 3 → ×1.07, day 7 → ×1.03, day 14 → ×1.01
  return 1 + 0.15 * Math.exp(-days / 4);
}

export function replyBoost(replyDays: string | null): number {
  if (!replyDays) return 1.0;
  const m = replyDays.match(/(\d+)/);
  if (!m) return 1.0;
  const days = parseInt(m[1]);
  if (days <= 3) return 1.12;
  if (days <= 7) return 1.06;
  return 1.0;
}

export function activityBoost(recruitmentActivity: string | null): number {
  return recruitmentActivity?.includes("活躍") ? 1.08 : 1.0;
}

export function competitionBoost(applicantCount: number | null): number {
  if (applicantCount === null) return 1.0;
  return applicantCount < 10 ? 1.10 : 1.0;
}

export function keywordMatchScore(
  keywords: string[],
  title: string,
  description: string | null
): number {
  if (keywords.length === 0) return 0;
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  const matched = keywords.filter((k) => haystack.includes(k.toLowerCase())).length;
  return matched / keywords.length;
}

export async function matchForUser(userId: string, topN = 10): Promise<MatchResult[]> {
  const intent = await prisma.jobIntent.findUnique({ where: { userId } });
  if (!intent) return [];

  const intentEmb = await prisma.intentEmbedding.findUnique({ where: { intentId: intent.id } });
  if (!intentEmb) return [];

  const keywords = intent.expandedKeywords as string[];
  const fetchN = topN * 3;

  // Check if user has resume embedding
  const resumeEmb = await prisma.resumeEmbedding.findFirst({
    where: { resume: { userId } },
    select: { resumeId: true },
  });
  const hasResume = resumeEmb !== null;

  // ── Hybrid Search ─────────────────────────────────────────────────────────
  // Path A: keyword filter
  let keywordCandidates: Array<{ jdId: string; intentScore: number; title: string; description: string | null }> = [];

  if (keywords.length > 0) {
    const titleConds = keywords.map((k) => Prisma.sql`j.title ILIKE ${"%" + k + "%"}`);
    const descConds  = keywords.map((k) => Prisma.sql`j.description ILIKE ${"%" + k + "%"}`);
    const orClause   = [...titleConds, ...descConds].reduce((a, b) => Prisma.sql`${a} OR ${b}`);

    keywordCandidates = await prisma.$queryRaw<typeof keywordCandidates>`
      SELECT
        je."jdId",
        (1 - (je.embedding <=> ie.embedding))::float AS "intentScore",
        j.title,
        j.description
      FROM "JdEmbedding" je
      JOIN "Jd" j ON j.id = je."jdId"
      CROSS JOIN (SELECT embedding FROM "IntentEmbedding" WHERE "intentId" = ${intent.id}) ie
      WHERE (${orClause})
      ORDER BY "intentScore" DESC
      LIMIT ${fetchN}
    `;
  }

  // Path B: pure vector search
  const vectorCandidates = await prisma.$queryRaw<typeof keywordCandidates>`
    SELECT
      je."jdId",
      (1 - (je.embedding <=> ie.embedding))::float AS "intentScore",
      j.title,
      j.description
    FROM "JdEmbedding" je
    JOIN "Jd" j ON j.id = je."jdId"
    CROSS JOIN (SELECT embedding FROM "IntentEmbedding" WHERE "intentId" = ${intent.id}) ie
    ORDER BY "intentScore" DESC
    LIMIT ${fetchN}
  `;

  // Union: keep best intentScore per jdId
  const merged = new Map<string, { intentScore: number; title: string; description: string | null }>();
  for (const c of [...keywordCandidates, ...vectorCandidates]) {
    const prev = merged.get(c.jdId);
    if (!prev || c.intentScore > prev.intentScore) {
      merged.set(c.jdId, { intentScore: c.intentScore, title: c.title, description: c.description });
    }
  }

  // ── Resume scoring ────────────────────────────────────────────────────────
  const resumeScoreMap = new Map<string, number>();
  if (hasResume && merged.size > 0) {
    const jdIds = Array.from(merged.keys());
    const rows = await prisma.$queryRaw<Array<{ jdId: string; resumeScore: number }>>`
      SELECT
        je."jdId",
        (1 - (je.embedding <=> re.embedding))::float AS "resumeScore"
      FROM "JdEmbedding" je
      CROSS JOIN (SELECT embedding FROM "ResumeEmbedding" WHERE "resumeId" = ${resumeEmb!.resumeId}) re
      WHERE je."jdId" = ANY(${jdIds}::text[])
    `;
    for (const row of rows) resumeScoreMap.set(row.jdId, Number(row.resumeScore));
  }

  // ── Re-rank with dynamic weights ─────────────────────────────────────────
  return Array.from(merged.entries())
    .map(([jdId, r]) => {
      const kScore      = keywordMatchScore(keywords, r.title, r.description);
      const intentScore = Number(r.intentScore);
      const resumeScore = resumeScoreMap.get(jdId) ?? 0;
      const finalScore  = hasResume
        ? 0.5 * intentScore + 0.2 * kScore + 0.3 * resumeScore
        : 0.7 * intentScore + 0.3 * kScore;
      return { jdId, resumeScore, intentScore, keywordScore: kScore, finalScore };
    })
    .sort((a, b) => b.finalScore - a.finalScore);
}
