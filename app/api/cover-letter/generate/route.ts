import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateCoverLetter, type Tone } from "@/lib/cover-letter/generate";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId, jdId, tone } = await req.json();

  let jd;
  if (applicationId) {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { jd: true },
    });
    if (!app || app.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    jd = app.jd;
  } else if (jdId) {
    jd = await prisma.jd.findUnique({ where: { id: jdId } });
  }

  if (!jd) return NextResponse.json({ error: "JD not found" }, { status: 404 });

  const resume = await prisma.resume.findUnique({ where: { userId: session.user.id } });
  if (!resume) {
    return NextResponse.json({ error: "請先上傳履歷" }, { status: 400 });
  }

  try {
    const coverLetter = await generateCoverLetter({
      jdTitle: jd.title,
      jdCompanyName: jd.companyName,
      jdDescription: jd.description,
      jdSkills: (jd.skills as string[]) ?? [],
      resumeTitle: resume.title,
      resumeSkills: (resume.skills as string[]) ?? [],
      resumeSeniority: resume.seniority,
      tone: (tone as Tone) ?? "formal",
    });

    return NextResponse.json({ coverLetter });
  } catch (e) {
    console.error("Cover letter generate error:", e);
    return NextResponse.json({ error: "生成失敗，請稍後再試" }, { status: 500 });
  }
}
