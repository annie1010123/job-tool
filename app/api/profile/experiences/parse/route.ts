import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { extractExperiences, pdfToText } from "@/lib/resume/parse";

// 快速匯入：上傳 PDF 或貼上經歷文字 → AI 抽成多筆結構化經歷 → 建立
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let text = "";
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.type !== "application/pdf") {
      return NextResponse.json({ error: "請上傳 PDF 檔案" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "檔案不得超過 10MB" }, { status: 400 });
    }
    try {
      text = await pdfToText(Buffer.from(await file.arrayBuffer()));
    } catch {
      return NextResponse.json({ error: "PDF 解析失敗，請改用貼上文字" }, { status: 400 });
    }
  } else {
    const body = await req.json().catch(() => ({}));
    text = (body as { text?: string }).text ?? "";
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "沒有可解析的內容" }, { status: 400 });
  }

  const extracted = await extractExperiences(text);
  if (extracted.length === 0) {
    return NextResponse.json({ error: "沒有解析到經歷，請確認內容或手動新增" }, { status: 422 });
  }

  // 建立經歷（接在現有之後）
  const count = await prisma.workExperience.count({ where: { userId } });
  const created = [];
  for (let i = 0; i < extracted.length; i++) {
    const e = extracted[i];
    const exp = await prisma.workExperience.create({
      data: {
        userId,
        type: e.type,
        company: e.company,
        role: e.role,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
        skills: e.skills,
        order: count + i,
      },
    });
    created.push(exp);
  }

  return NextResponse.json({ experiences: created, count: created.length });
}
