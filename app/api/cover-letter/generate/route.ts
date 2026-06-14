import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { generateCoverLetter, type Tone } from "@/lib/cover-letter/generate";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId, jdId, tone } = await req.json() as {
    applicationId?: string;
    jdId?: string;
    tone?: string;
  };

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

  const [resume, workExperiences] = await Promise.all([
    prisma.resume.findUnique({ where: { userId: session.user.id } }),
    prisma.workExperience.findMany({
      where: { userId: session.user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!resume && workExperiences.length === 0) {
    return NextResponse.json({ error: "請先在「個人資料」填寫工作經歷，或上傳履歷" }, { status: 400 });
  }

  try {
    const coverLetter = await generateCoverLetter({
      jdTitle: jd.title,
      jdCompanyName: jd.companyName,
      jdDescription: jd.description,
      jdSkills: (jd.skills as string[]) ?? [],
      workExperiences: workExperiences.map((e) => ({
        type: e.type,
        company: e.company,
        role: e.role,
        startDate: e.startDate,
        endDate: e.endDate,
        description: e.description,
        skills: (e.skills as string[]) ?? [],
      })),
      resumeTitle: resume?.title ?? null,
      resumeSeniority: resume?.seniority ?? null,
      tone: (tone as Tone) ?? "formal",
    });

    return NextResponse.json({ coverLetter });
  } catch (e) {
    console.error("Cover letter generate error:", e);
    return NextResponse.json({ error: "生成失敗，請稍後再試" }, { status: 500 });
  }
}
