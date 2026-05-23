import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { expandIntent } from "@/lib/intent/expand";
import { embedText } from "@/lib/resume/embed";
import { prisma } from "@/lib/db/client";
import { sendPreviewEmail } from "@/lib/match/preview";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { rawInput } = (await req.json()) as { rawInput?: string };
  if (!rawInput?.trim()) {
    return NextResponse.json({ error: "請輸入求職意圖" }, { status: 400 });
  }

  const expandedKeywords = await expandIntent(rawInput.trim());

  // Upsert JobIntent
  const intent = await prisma.jobIntent.upsert({
    where: { userId },
    create: { userId, rawInput: rawInput.trim(), expandedKeywords },
    update: { rawInput: rawInput.trim(), expandedKeywords },
  });

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

  // Fire-and-forget preview email after intent saved
  const userEmail = session.user.email;
  if (userEmail) {
    sendPreviewEmail(userId, userEmail).catch((e) =>
      console.error("Preview email failed (non-fatal):", e)
    );
  }

  return NextResponse.json({ success: true, expandedKeywords });
}
