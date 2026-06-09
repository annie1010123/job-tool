import { NextRequest, NextResponse } from "next/server";
import { generateCoverLetterFromJdOnly, type Tone } from "@/lib/cover-letter/generate";

const ipCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipCounts.set(ip, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in an hour." }, { status: 429 });
  }

  const { jdText, tone } = await req.json();
  if (!jdText || typeof jdText !== "string" || jdText.trim().length < 20) {
    return NextResponse.json({ error: "請輸入至少 20 字的職缺描述" }, { status: 400 });
  }

  try {
    const coverLetter = await generateCoverLetterFromJdOnly(jdText, (tone as Tone) ?? "formal");
    return NextResponse.json({ coverLetter });
  } catch (e) {
    console.error("Cover letter try error:", e);
    return NextResponse.json({ error: "生成失敗，請稍後再試" }, { status: 500 });
  }
}
