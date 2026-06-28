import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { getQuestion } from "@/lib/interview/store";

const CATEGORIES = ["behavioral", "motivation", "situational", "technical"];

// POST /api/interview/questions — 新增自訂題（isCore=true、coreKey=null、附一個預設版本）。
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { question?: string; category?: string };
  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });
  const category = CATEGORIES.includes(body.category ?? "") ? body.category! : "behavioral";

  const created = await prisma.questionBank.create({
    data: {
      userId: session.user.id,
      question,
      category,
      isCore: true,
      versions: { create: [{ label: "我的版本" }] },
    },
  });
  const dto = await getQuestion(session.user.id, created.id);
  return NextResponse.json(dto, { status: 201 });
}
