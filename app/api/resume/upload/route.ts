import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { parseResumeText } from "@/lib/resume/parse";
import { embedResume } from "@/lib/resume/embed";
import { prisma } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "請上傳 PDF 檔案" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "檔案大小不得超過 10MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Upload to Supabase Storage
  const supabase = createSupabaseAdmin();
  const storagePath = `resumes/${userId}/${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buffer, { contentType: "application/pdf", upsert: true });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return NextResponse.json({ error: "儲存失敗，請再試一次" }, { status: 500 });
  }

  const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${storagePath}`;

  // Parse PDF text + structure with Groq
  let parsed;
  let rawText = "";
  try {
    const result = await parseResumeText(buffer);
    rawText = result.rawText;
    parsed = result.parsed;
  } catch (e) {
    console.error("PDF parse failed:", e);
    parsed = { title: null, seniority: null, industry: null, skills: [], yearsExperience: null };
  }

  // Upsert Resume record
  const resume = await prisma.resume.upsert({
    where: { userId },
    create: {
      userId,
      storageUrl,
      title: parsed.title,
      seniority: parsed.seniority,
      industry: parsed.industry,
      skills: parsed.skills,
      yearsExperience: parsed.yearsExperience,
      parsedAt: new Date(),
    },
    update: {
      storageUrl,
      title: parsed.title,
      seniority: parsed.seniority,
      industry: parsed.industry,
      skills: parsed.skills,
      yearsExperience: parsed.yearsExperience,
      parsedAt: new Date(),
    },
  });

  // Generate and store embedding (non-blocking, best-effort)
  try {
    const vector = await embedResume(rawText, parsed);
    const vectorLiteral = `[${vector.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ResumeEmbedding" ("resumeId", "embedding", "updatedAt")
       VALUES ($1, $2::vector, NOW())
       ON CONFLICT ("resumeId") DO UPDATE SET "embedding" = $2::vector, "updatedAt" = NOW()`,
      resume.id,
      vectorLiteral
    );
  } catch (e) {
    console.error("Embedding failed (non-fatal):", e);
  }

  return NextResponse.json({
    success: true,
    resume: {
      id: resume.id,
      title: resume.title,
      seniority: resume.seniority,
      skills: resume.skills,
    },
  });
}
