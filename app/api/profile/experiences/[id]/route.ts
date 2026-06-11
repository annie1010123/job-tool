import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.workExperience.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json() as {
    company?: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    skills?: string[];
    order?: number;
  };

  const updated = await prisma.workExperience.update({
    where: { id },
    data: {
      ...(body.company !== undefined && { company: body.company.trim() }),
      ...(body.role !== undefined && { role: body.role.trim() }),
      ...(body.startDate !== undefined && { startDate: body.startDate.trim() || null }),
      ...(body.endDate !== undefined && { endDate: body.endDate.trim() || null }),
      ...(body.description !== undefined && { description: body.description.trim() }),
      ...(body.skills !== undefined && { skills: body.skills }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  return NextResponse.json({ experience: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.workExperience.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.workExperience.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
