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
    name?: string | null;
    school?: string | null;
    department?: string | null;
    grade?: string | null;
    portfolioUrl?: string | null;
    linkedinUrl?: string | null;
  };

  // 欄位可能是 null（前端清空欄位）——一律轉成 trimmed 字串或 null
  const clean = (v: string | null | undefined) => (typeof v === "string" && v.trim() ? v.trim() : null);

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(body.name !== undefined && { name: clean(body.name) }),
      ...(body.school !== undefined && { school: clean(body.school) }),
      ...(body.department !== undefined && { department: clean(body.department) }),
      ...(body.grade !== undefined && { grade: clean(body.grade) }),
      ...(body.portfolioUrl !== undefined && { portfolioUrl: clean(body.portfolioUrl) }),
      ...(body.linkedinUrl !== undefined && { linkedinUrl: clean(body.linkedinUrl) }),
    },
    select: { name: true, email: true, school: true, department: true, grade: true, portfolioUrl: true, linkedinUrl: true },
  });

  return NextResponse.json({ profile: updated });
}
