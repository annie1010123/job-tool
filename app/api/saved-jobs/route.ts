import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.savedJob.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: "desc" },
    include: { jd: { select: { id: true, title: true, companyName: true, externalUrl: true } } },
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { jdId, externalUrl, companyName, title, platform, companyType } = body;

  if (!companyName || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const url = externalUrl?.trim() || `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const job = await prisma.savedJob.upsert({
    where: {
      userId_externalUrl: { userId: session.user.id, externalUrl: url },
    },
    update: {},
    create: {
      userId: session.user.id,
      jdId: jdId ?? null,
      externalUrl: url,
      companyName,
      title,
      platform: platform ?? "other",
      companyType: companyType ?? null,
    },
  });

  return NextResponse.json({ job });
}
