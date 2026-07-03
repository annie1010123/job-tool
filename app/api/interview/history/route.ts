import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listAskedQuestionsByRole } from "@/lib/interview/store";

// GET /api/interview/history?roleCategory=pm
// 歷史題（考古題）：QuestionBank isCore=false，依 roleCategory 篩選（該職類或 null）。
// 省略 roleCategory 參數 = 回傳全部考古題（申請未設定職類時用）。
// 回傳形狀：{ questions: QuestionDTO[] }
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const raw = req.nextUrl.searchParams.get("roleCategory");
  const roleCategory = raw && raw.trim().length > 0 ? raw.trim() : null;

  const questions = await listAskedQuestionsByRole(session.user.id, roleCategory);
  return NextResponse.json({ questions });
}
