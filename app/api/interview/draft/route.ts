import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { draftAnswer } from "@/lib/interview/coach";
import { buildResumeContext } from "@/lib/interview/store";
import { CORE_QUESTIONS } from "@/lib/interview/core-questions";

// POST /api/interview/draft — 依題目 + 履歷生成「起點初稿」（不自動儲存，前端帶入後使用者再編輯）。
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as { questionId?: string };
  if (!body.questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  const qb = await prisma.questionBank.findUnique({
    where: { id: body.questionId },
    select: { userId: true, question: true, coreKey: true },
  });
  if (!qb || qb.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hint = (qb.coreKey ? CORE_QUESTIONS.find((c) => c.coreKey === qb.coreKey)?.hint : null) ?? "具體、有結構、有量化佐證。";
  const resumeContext = await buildResumeContext(userId);
  const draft = await draftAnswer({ question: qb.question, hint, resumeContext });

  if (!draft) return NextResponse.json({ error: "初稿生成失敗，請稍後再試" }, { status: 502 });
  return NextResponse.json({ draft });
}
