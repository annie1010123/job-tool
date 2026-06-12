import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { expandIntent } from "@/lib/intent/expand";
import { embedText } from "@/lib/resume/embed";
import { prisma } from "@/lib/db/client";
import { sendPreviewEmail } from "@/lib/match/preview";
import { matchForUser } from "@/lib/match/score";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { rawInput, selectedKeywords, locationFilter } = (await req.json()) as {
    rawInput?: string;
    selectedKeywords?: string[];
    locationFilter?: string[];
  };
  if (!rawInput?.trim()) {
    return NextResponse.json({ error: "請輸入求職意圖" }, { status: 400 });
  }

  // If selectedKeywords provided (confirm step), skip LLM re-expansion
  const expandedKeywords = selectedKeywords ?? await expandIntent(rawInput.trim());

  // Upsert JobIntent
  const intent = await prisma.jobIntent.upsert({
    where: { userId },
    create: { userId, rawInput: rawInput.trim(), expandedKeywords },
    update: { rawInput: rawInput.trim(), expandedKeywords },
  });

  // Update locationFilter on User if provided
  if (locationFilter && Array.isArray(locationFilter)) {
    await prisma.user.update({
      where: { id: userId },
      data: { locationFilter },
    });
  }

  // Generate and store embedding (non-blocking)
  try {
    const intentText = `${rawInput}\n關鍵字：${expandedKeywords.join(", ")}`;
    const vector = await embedText(intentText);
    const vectorLiteral = `[${vector.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "IntentEmbedding" ("intentId", "embedding", "updatedAt")
       VALUES ($1, $2::vector, NOW())
       ON CONFLICT ("intentId") DO UPDATE SET "embedding" = $2::vector, "updatedAt" = NOW()`,
      intent.id,
      vectorLiteral
    );
  } catch (e) {
    console.error("Intent embedding failed (non-fatal):", e);
  }

  // Fire-and-forget: refresh recommendations + preview email
  const userEmail = session.user.email;
  Promise.all([
    // Rebuild today's recommendation batch immediately
    matchForUser(userId, 20).then(async (matches) => {
      if (matches.length === 0) return;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.recommendation.deleteMany({ where: { userId, dailyBatch: today } });
      await prisma.recommendation.createMany({
        data: matches.map((m) => ({
          userId,
          jdId: m.jdId,
          resumeScore: m.resumeScore,
          intentScore: m.intentScore,
          finalScore: m.finalScore,
          dailyBatch: today,
        })),
      });
    }),
    userEmail
      ? sendPreviewEmail(userId, userEmail)
      : Promise.resolve(),
  ]).catch((e) => console.error("Post-intent refresh failed (non-fatal):", e));

  return NextResponse.json({ success: true, expandedKeywords });
}
