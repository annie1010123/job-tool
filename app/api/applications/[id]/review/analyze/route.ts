import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { analyzeInterview } from "@/lib/review/analyze";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reviewId } = await req.json();
  const review = await prisma.interviewReview.findUnique({
    where: { id: reviewId },
    include: { application: { select: { userId: true, roleCategory: true } } },
  });

  if (!review || review.application.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!review.transcript) {
    return NextResponse.json({ error: "No transcript available" }, { status: 400 });
  }

  const analysis = await analyzeInterview(review.transcript);

  await prisma.interviewReview.update({
    where: { id: reviewId },
    data: {
      extractedQA: analysis.extractedQA as unknown as Prisma.JsonArray,
      overallFeedback: analysis.overallFeedback,
    },
  });

  const appRoleCategory = review.application.roleCategory ?? null;

  // Auto-populate question bank
  for (const qa of analysis.extractedQA) {
    await prisma.questionBank.create({
      data: {
        userId: session.user.id,
        question: qa.question,
        answer: qa.answer_summary,
        category: qa.category,
        sourceApplicationId: review.applicationId,
        userPerformance: qa.quality,
        roleCategory: appRoleCategory,
      },
    });
  }

  return NextResponse.json({ analysis });
}
