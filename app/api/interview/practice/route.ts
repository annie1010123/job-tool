import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ensureCoreQuestion, getQuestion } from "@/lib/interview/store";

// POST /api/interview/practice — 進入練習：核心題用 coreKey（不存在則建立），自訂/復盤題用 questionId。
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { coreKey?: string; questionId?: string };

  try {
    if (body.coreKey) {
      const q = await ensureCoreQuestion(session.user.id, body.coreKey);
      return NextResponse.json(q);
    }
    if (body.questionId) {
      const q = await getQuestion(session.user.id, body.questionId);
      if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(q);
    }
    return NextResponse.json({ error: "coreKey or questionId required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad request" }, { status: 400 });
  }
}
