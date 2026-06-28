import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

// POST /api/interview/versions — 為某題新增一個版本（自訂名稱）。
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { questionId?: string; label?: string };
  if (!body.questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  const qb = await prisma.questionBank.findUnique({ where: { id: body.questionId }, select: { userId: true } });
  if (!qb || qb.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const label = body.label?.trim() || "新版本";
  const v = await prisma.answerVersion.create({
    data: { questionBankId: body.questionId, label },
  });
  return NextResponse.json(
    { id: v.id, label: v.label, content: v.content, grade: v.grade, score: v.score, lastCoaching: null, updatedAt: v.updatedAt.toISOString() },
    { status: 201 },
  );
}
