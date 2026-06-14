import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const experiences = await prisma.workExperience.findMany({
    where: { userId: session.user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ experiences });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    type?: string;
    company: string;
    role: string;
    startDate?: string;
    endDate?: string;
    description: string;
    skills?: string[];
  };

  if (!body.company?.trim() || !body.role?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "名稱、角色和描述為必填" }, { status: 400 });
  }

  const count = await prisma.workExperience.count({ where: { userId: session.user.id } });

  const exp = await prisma.workExperience.create({
    data: {
      userId: session.user.id,
      type: body.type?.trim() || "工作",
      company: body.company.trim(),
      role: body.role.trim(),
      startDate: body.startDate?.trim() || null,
      endDate: body.endDate?.trim() || null,
      description: body.description.trim(),
      skills: body.skills ?? [],
      order: count,
    },
  });

  return NextResponse.json({ experience: exp }, { status: 201 });
}
