import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { analyzeManualInput } from "@/lib/review/analyze";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app || app.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { questions } = await req.json();
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json({ error: "請至少填寫一題" }, { status: 400 });
  }

  const analysis = await analyzeManualInput(questions);

  const review = await prisma.interviewReview.create({
    data: {
      applicationId: id,
      transcript: questions.map((q: { question: string; answer: string }) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n"),
      extractedQA: analysis.extractedQA as unknown as Prisma.JsonArray,
      overallFeedback: analysis.overallFeedback,
    },
  });

  // Auto-populate question bank
  for (const qa of analysis.extractedQA) {
    await prisma.questionBank.create({
      data: {
        userId: session.user.id,
        question: qa.question,
        answer: qa.answer_summary,
        category: qa.category,
        sourceApplicationId: id,
        userPerformance: qa.quality,
        roleCategory: app.roleCategory ?? null,
      },
    });
  }

  return NextResponse.json({ review, analysis });
}
