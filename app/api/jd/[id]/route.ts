import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

// 輕量端點：只回傳單一 JD 的 description（清單為了速度不抓 description，Modal 開啟時才呼叫）
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const jd = await prisma.jd.findUnique({
    where: { id },
    select: { description: true },
  });
  if (!jd) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ description: jd.description });
}
