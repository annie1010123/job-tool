import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const intent = await prisma.jobIntent.findUnique({
    where: { userId: session.user.id },
    select: { rawInput: true },
  });

  return NextResponse.json({ rawInput: intent?.rawInput ?? "" });
}
