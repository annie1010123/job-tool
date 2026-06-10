import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id, isArchived: false },
    include: {
      jd: { select: { id: true, title: true, companyName: true, salaryRange: true, location: true, externalUrl: true, description: true } },
      interviewRecords: { orderBy: { interviewedAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // 手動新增：不帶 jdId，自行建立 Jd 後再建 Application
  if (!body.jdId) {
    const { companyName, jobTitle, sourceUrl, jdContent, companyType } = body;
    if (!companyName || !jobTitle) {
      return NextResponse.json({ error: "companyName and jobTitle required" }, { status: 400 });
    }

    const externalUrl = sourceUrl?.trim() || `manual://${crypto.randomUUID()}`;

    const jd = await prisma.jd.upsert({
      where: { externalUrl },
      update: {},
      create: {
        externalUrl,
        companyName: companyName.trim(),
        title: jobTitle.trim(),
        source: "manual",
        description: jdContent?.trim() ?? null,
      },
    });

    const existingManual = await prisma.application.findUnique({
      where: { userId_jdId: { userId: session.user.id, jdId: jd.id } },
      include: { jd: { select: { title: true, companyName: true } } },
    });

    if (existingManual) {
      return NextResponse.json({ application: existingManual });
    }

    const application = await prisma.application.create({
      data: {
        userId: session.user.id,
        jdId: jd.id,
        status: body.status ?? "not_applied",
        companyType: companyType ?? null,
      },
      include: { jd: { select: { title: true, companyName: true } } },
    });

    return NextResponse.json({ application });
  }

  // 原有流程：從推薦清單加入
  const existing = await prisma.application.findUnique({
    where: { userId_jdId: { userId: session.user.id, jdId: body.jdId } },
    include: { jd: { select: { title: true, companyName: true } } },
  });

  if (existing) {
    // ♡ 收藏：只有在 not_applied 時才升級成 watching，已投遞/面試中的不降級
    if (body.status === "watching" && existing.status === "not_applied") {
      const updated = await prisma.application.update({
        where: { id: existing.id },
        data: { status: "watching" },
        include: { jd: { select: { title: true, companyName: true } } },
      });
      return NextResponse.json({ application: updated });
    }
    return NextResponse.json({ application: existing });
  }

  const application = await prisma.application.create({
    data: { userId: session.user.id, jdId: body.jdId, status: body.status ?? "not_applied" },
    include: { jd: { select: { title: true, companyName: true } } },
  });

  return NextResponse.json({ application });
}
