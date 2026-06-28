import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { getQuestion } from "@/lib/interview/store";

async function owns(userId: string, id: string): Promise<boolean> {
  const qb = await prisma.questionBank.findUnique({ where: { id }, select: { userId: true } });
  return !!qb && qb.userId === userId;
}

// PATCH /api/interview/questions/[id] — 編輯題目文字。
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await owns(session.user.id, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { question?: string };
  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  await prisma.questionBank.update({ where: { id }, data: { question } });
  return NextResponse.json(await getQuestion(session.user.id, id));
}

// DELETE /api/interview/questions/[id] — 刪除題目（連帶版本 cascade）。
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await owns(session.user.id, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.questionBank.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
