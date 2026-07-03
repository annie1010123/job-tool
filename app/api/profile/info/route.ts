import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, school: true, department: true, grade: true, portfolioUrl: true, linkedinUrl: true },
  });

  return NextResponse.json({ profile: user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    school?: string;
    department?: string;
    grade?: string;
    portfolioUrl?: string;
    linkedinUrl?: string;
  };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() || null }),
      ...(body.school !== undefined && { school: body.school.trim() || null }),
      ...(body.department !== undefined && { department: body.department.trim() || null }),
      ...(body.grade !== undefined && { grade: body.grade.trim() || null }),
      ...(body.portfolioUrl !== undefined && { portfolioUrl: body.portfolioUrl.trim() || null }),
      ...(body.linkedinUrl !== undefined && { linkedinUrl: body.linkedinUrl.trim() || null }),
    },
    select: { name: true, email: true, school: true, department: true, grade: true, portfolioUrl: true, linkedinUrl: true },
  });

  return NextResponse.json({ profile: updated });
}
