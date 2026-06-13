import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { expandIntent } from "@/lib/intent/expand";
import { embedText } from "@/lib/resume/embed";
import { prisma } from "@/lib/db/client";
import { sendPreviewEmail } from "@/lib/match/preview";
import { buildAndSaveRecommendations } from "@/lib/match/build";

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

  // 解析意圖：取得全部關鍵字 + 角色關鍵字（角色關鍵字供爬蟲搜尋，避免技能字撈到不同職種）
  const expansion = await expandIntent(rawInput.trim());
  const expandedKeywords = selectedKeywords ?? expansion.keywords;
  const roleKeywords = expansion.roleKeywords;

  // Upsert JobIntent
  const intent = await prisma.jobIntent.upsert({
    where: { userId },
    create: { userId, rawInput: rawInput.trim(), expandedKeywords, roleKeywords },
    update: { rawInput: rawInput.trim(), expandedKeywords, roleKeywords },
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

  // Fire-and-forget: 用與 cron 相同的管線重建推薦（含 LLM 精排），編輯意圖即時生效
  // excludeRecentDays: 0 → 顯示全部相符（不排除近期，讓使用者改完馬上看到完整結果）
  const userEmail = session.user.email;
  Promise.all([
    buildAndSaveRecommendations(userId, rawInput.trim(), { excludeRecentDays: 0 }),
    userEmail ? sendPreviewEmail(userId, userEmail) : Promise.resolve(),
  ]).catch((e) => console.error("Post-intent refresh failed (non-fatal):", e));

  return NextResponse.json({ success: true, expandedKeywords });
}
