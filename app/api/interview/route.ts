import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listCoreQuestions, listAskedQuestions } from "@/lib/interview/store";
import { startOfWeekUsage } from "@/lib/interview/usage";

// GET /api/interview — 核心題視角 + 常被問到視角 + 北極星（本週練習次數）。
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [core, asked, weeklyCoachUses] = await Promise.all([
    listCoreQuestions(userId),
    listAskedQuestions(userId),
    startOfWeekUsage(userId),
  ]);

  const prepared = core.filter((q) => q.prepared).length;
  return NextResponse.json({
    core,
    asked,
    stats: { preparedCount: prepared, totalCore: core.length, weeklyCoachUses },
  });
}
