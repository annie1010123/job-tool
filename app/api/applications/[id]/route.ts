import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const app = await prisma.application.findUnique({ where: { id }, include: { jd: true } });
  if (!app || app.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update Application fields
  const updated = await prisma.application.update({
    where: { id },
    data: {
      ...(body.status !== undefined && { status: body.status }),
      ...(body.companyType !== undefined && { companyType: body.companyType }),
      ...(body.appliedAt !== undefined && { appliedAt: body.appliedAt ? new Date(body.appliedAt) : null }),
      ...(body.scheduledAt !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
      ...(body.note !== undefined && { note: body.note }),
      ...(body.aiQuestions !== undefined && { aiQuestions: body.aiQuestions }),
      ...(body.isArchived    !== undefined && { isArchived: body.isArchived }),
      ...(body.archiveReason !== undefined && { archiveReason: body.archiveReason ?? null }),
      ...(body.archivedAt    !== undefined && { archivedAt: body.archivedAt ? new Date(body.archivedAt) : null }),
    },
  });

  // Update Jd fields if provided (title, companyName, externalUrl, description)
  if (body.jd && typeof body.jd === "object") {
    const jdData: Record<string, string> = {};
    if (body.jd.title !== undefined) jdData.title = body.jd.title;
    if (body.jd.companyName !== undefined) jdData.companyName = body.jd.companyName;
    if (body.jd.externalUrl !== undefined) jdData.externalUrl = body.jd.externalUrl;
    if (body.jd.description !== undefined) jdData.description = body.jd.description;
    if (Object.keys(jdData).length > 0) {
      await prisma.jd.update({ where: { id: app.jdId }, data: jdData });
    }
  }

  revalidatePath("/board");
  return NextResponse.json({ application: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app || app.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
