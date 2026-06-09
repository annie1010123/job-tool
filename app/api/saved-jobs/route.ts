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

  if (!externalUrl || !companyName || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const job = await prisma.savedJob.upsert({
    where: {
      userId_externalUrl: { userId: session.user.id, externalUrl },
    },
    update: {},
    create: {
      userId: session.user.id,
      jdId: jdId ?? null,
      externalUrl,
      companyName,
      title,
      platform: platform ?? "other",
      companyType: companyType ?? null,
    },
  });

  return NextResponse.json({ job });
}
