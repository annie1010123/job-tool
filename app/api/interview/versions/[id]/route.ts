import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

async function ownedVersion(userId: string, id: string) {
  const v = await prisma.answerVersion.findUnique({
    where: { id },
    include: { question: { select: { userId: true } } },
  });
  return v && v.question.userId === userId ? v : null;
}

// PATCH /api/interview/versions/[id] — 儲存版本內容 / 改名（不觸發評估）。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await ownedVersion(session.user.id, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { content?: string; label?: string };
  const data: { content?: string; label?: string } = {};
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const v = await prisma.answerVersion.update({ where: { id }, data });
  return NextResponse.json({
    id: v.id,
    label: v.label,
    content: v.content,
    grade: v.grade,
    score: v.score,
    lastCoaching: v.lastCoaching ?? null,
    updatedAt: v.updatedAt.toISOString(),
  });
}

// DELETE /api/interview/versions/[id] — 刪除版本（題目至少保留一個版本）。
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const v = await ownedVersion(session.user.id, id);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const count = await prisma.answerVersion.count({ where: { questionBankId: v.questionBankId } });
  if (count <= 1) return NextResponse.json({ error: "至少保留一個版本" }, { status: 400 });

  await prisma.answerVersion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
