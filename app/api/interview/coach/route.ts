import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { coachAnswer } from "@/lib/interview/coach";
import { buildResumeContext } from "@/lib/interview/store";
import { logCoachUsage } from "@/lib/interview/usage";

const DAILY_LIMIT = 30; // 成本封頂：每人每日教練評估上限。

// POST /api/interview/coach — 儲存版本答案 + 請教練評估，回傳評等與建議；計入北極星。
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as { versionId?: string; answer?: string };
  if (!body.versionId || typeof body.answer !== "string") {
    return NextResponse.json({ error: "versionId and answer required" }, { status: 400 });
  }
  const answer = body.answer.trim();
  if (answer.length < 10) {
    return NextResponse.json({ error: "答案太短，先寫幾句吧" }, { status: 400 });
  }

  // 驗證版本擁有者 + 取題目資訊
  const version = await prisma.answerVersion.findUnique({
    where: { id: body.versionId },
    include: { question: { select: { userId: true, question: true, category: true, coreKey: true } } },
  });
  if (!version || version.question.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 每日上限
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const todayUses = await prisma.coachUsage.count({ where: { userId, createdAt: { gte: since } } });
  if (todayUses >= DAILY_LIMIT) {
    return NextResponse.json({ error: "今天的 AI 教練次數已達上限，明天再來吧" }, { status: 429 });
  }

  const resumeContext = await buildResumeContext(userId);
  const result = await coachAnswer({
    question: version.question.question,
    answer,
    category: version.question.category,
    resumeContext,
  });

  // 先存答案 + 評估結果（即使是 fallback 也存答案）
  await prisma.answerVersion.update({
    where: { id: version.id },
    data: {
      content: answer,
      grade: result.grade,
      score: gradeToScore(result.grade),
      lastCoaching: result as object,
    },
  });
  await logCoachUsage(userId, version.question.coreKey);

  return NextResponse.json(result);
}

function gradeToScore(grade: string): number {
  return grade === "good" ? 85 : grade === "ok" ? 60 : 35;
}
