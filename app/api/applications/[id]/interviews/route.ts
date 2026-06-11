import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import Groq from "groq-sdk";

interface AiReview {
  good: string;
  improve: string;
  suggested: string;
}

interface QaWithReview {
  question: string;
  answer: string;
  aiReview?: AiReview;
}

async function reviewQA(jobTitle: string, qa: QaWithReview[]): Promise<QaWithReview[]> {
  if (!process.env.GROQ_API_KEY) return qa;

  const answeredQA = qa.filter((q) => q.answer?.trim());
  if (answeredQA.length === 0) return qa;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `你是面試教練。針對以下「${jobTitle}」面試的問答，為每一題提供三段回饋。

問答列表（JSON）：
${JSON.stringify(answeredQA.map((q, i) => ({ index: i, question: q.question, answer: q.answer })))}

輸出規則：
- 只輸出 JSON array，不要 markdown 或任何說明
- 每題格式：{ "index": 數字, "good": "回答得好的地方（1-2句）", "improve": "可以更具體的地方（1-2句）", "suggested": "建議優化版本（2-3句，直接示範更好的回答）" }
- 所有內容使用繁體中文`;

  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = resp.choices[0].message.content ?? "[]";
    const reviews = JSON.parse(text.replace(/```json|```/g, "").trim()) as {
      index: number;
      good: string;
      improve: string;
      suggested: string;
    }[];

    // Merge reviews back into original qa array
    const reviewMap = new Map(reviews.map((r) => [r.index, r]));
    let answeredIdx = 0;
    return qa.map((q) => {
      if (!q.answer?.trim()) return q;
      const review = reviewMap.get(answeredIdx++);
      return review ? { ...q, aiReview: { good: review.good, improve: review.improve, suggested: review.suggested } } : q;
    });
  } catch {
    return qa;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: { jd: { select: { title: true } } },
  });
  if (!app || app.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { interviewedAt, interviewer, qa, notes } = await req.json();

  // Save record first
  const record = await prisma.interviewRecord.create({
    data: {
      applicationId: id,
      interviewedAt: new Date(interviewedAt),
      interviewer: interviewer || null,
      qa: qa ?? [],
      notes: notes || null,
    },
  });

  // Run AI review and update record with results
  const enrichedQA = await reviewQA(app.jd.title, (qa ?? []) as QaWithReview[]);
  const updatedRecord = await prisma.interviewRecord.update({
    where: { id: record.id },
    data: { qa: enrichedQA as unknown as Prisma.JsonArray },
  });

  return NextResponse.json({ record: updatedRecord });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app || app.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const records = await prisma.interviewRecord.findMany({
    where: { applicationId: id },
    orderBy: { interviewedAt: "desc" },
  });

  return NextResponse.json({ records });
}
