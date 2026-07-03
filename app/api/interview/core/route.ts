import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listCoreQuestions } from "@/lib/interview/store";

// GET /api/interview/core — 核心題清單（QuestionBank isCore=true 的策展 + 自訂題，含各題版本）。
// 輕量版：只回核心題，不算常被問到 / 北極星，供申請詳情面試準備分頁的「核心題目」區使用。
// 回傳形狀：{ questions: QuestionDTO[] }
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const questions = await listCoreQuestions(session.user.id);
  return NextResponse.json({ questions });
}
