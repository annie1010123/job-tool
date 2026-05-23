import { Prisma } from "@prisma/client";
import { prisma } from "../db/client";

export interface MatchResult {
  jdId: string;
  resumeScore: number;
  intentScore: number;
  finalScore: number;
}

function recencyBoost(postedAt: string | null): number {
  if (!postedAt) return 1.0;
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const mm2 = String(yesterday.getMonth() + 1).padStart(2, "0");
  const dd2 = String(yesterday.getDate()).padStart(2, "0");
  const todayStr = `${mm}/${dd}`;
  const yesterdayStr = `${mm2}/${dd2}`;
  return postedAt === todayStr || postedAt === yesterdayStr ? 1.15 : 1.0;
}

function competitionBoost(applicantCount: number | null): number {
  if (applicantCount === null) return 1.0;
  return applicantCount < 5 ? 1.10 : 1.0;
}

const RESUME_WEIGHT = 0.2;
const INTENT_WEIGHT = 0.8;

export { recencyBoost, competitionBoost };

export async function matchForUser(userId: string, topN = 10): Promise<MatchResult[]> {
  const [resume, intent] = await Promise.all([
    prisma.resume.findUnique({ where: { userId } }),
    prisma.jobIntent.findUnique({ where: { userId } }),
  ]);

  if (!resume || !intent) return [];

  const [resumeEmb, intentEmb] = await Promise.all([
    prisma.resumeEmbedding.findUnique({ where: { resumeId: resume.id } }),
    prisma.intentEmbedding.findUnique({ where: { intentId: intent.id } }),
  ]);

  if (!resumeEmb || !intentEmb) return [];

  const keywords = intent.expandedKeywords as string[];

  // Step 1: keyword-filtered vector search
  if (keywords.length > 0) {
    const conditions = keywords.map((k) => Prisma.sql`j.title ILIKE ${"%" + k + "%"}`);
    const orClause = conditions.reduce((a, b) => Prisma.sql`${a} OR ${b}`);

    const filtered = await prisma.$queryRaw<{
      jdId: string;
      resumeScore: number;
      intentScore: number;
      finalScore: number;
    }[]>`
      SELECT
        je."jdId",
        (1 - (je.embedding <=> re.embedding))::float AS "resumeScore",
        (1 - (je.embedding <=> ie.embedding))::float AS "intentScore",
        (${RESUME_WEIGHT} * (1 - (je.embedding <=> re.embedding)) +
         ${INTENT_WEIGHT} * (1 - (je.embedding <=> ie.embedding)))::float AS "finalScore"
      FROM "JdEmbedding" je
      JOIN "Jd" j ON j.id = je."jdId"
      CROSS JOIN (SELECT embedding FROM "ResumeEmbedding" WHERE "resumeId" = ${resume.id}) re
      CROSS JOIN (SELECT embedding FROM "IntentEmbedding" WHERE "intentId" = ${intent.id}) ie
      WHERE (${orClause})
      ORDER BY "finalScore" DESC
      LIMIT ${topN}
    `;

    // If enough keyword-matched results, use them
    if (filtered.length >= Math.ceil(topN / 2)) {
      return filtered.map(toResult);
    }
  }

  // Step 2: fall back to pure vector search (no keyword filter)
  const rows = await prisma.$queryRaw<{
    jdId: string;
    resumeScore: number;
    intentScore: number;
    finalScore: number;
  }[]>`
    SELECT
      je."jdId",
      (1 - (je.embedding <=> re.embedding))::float AS "resumeScore",
      (1 - (je.embedding <=> ie.embedding))::float AS "intentScore",
      (${RESUME_WEIGHT} * (1 - (je.embedding <=> re.embedding)) +
       ${INTENT_WEIGHT} * (1 - (je.embedding <=> ie.embedding)))::float AS "finalScore"
    FROM "JdEmbedding" je
    CROSS JOIN (SELECT embedding FROM "ResumeEmbedding" WHERE "resumeId" = ${resume.id}) re
    CROSS JOIN (SELECT embedding FROM "IntentEmbedding" WHERE "intentId" = ${intent.id}) ie
    ORDER BY "finalScore" DESC
    LIMIT ${topN}
  `;

  return rows.map(toResult);
}

function toResult(r: { jdId: string; resumeScore: number; intentScore: number; finalScore: number }): MatchResult {
  return {
    jdId: r.jdId,
    resumeScore: Number(r.resumeScore),
    intentScore: Number(r.intentScore),
    finalScore: Number(r.finalScore),
  };
}
