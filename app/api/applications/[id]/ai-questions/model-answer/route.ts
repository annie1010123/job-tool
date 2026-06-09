import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import Groq from "groq-sdk";

const COMPANY_TYPE_CONTEXT: Record<string, string> = {
  startup: "新創公司文化，重視自主性、快速學習、跨功能協作",
  large: "大型企業，重視流程嚴謹、跨部門溝通、數據驅動決策",
  traditional: "傳統產業，重視穩定性、對產業的了解、溝通應對能力",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    select: { userId: true, companyType: true, jd: { select: { title: true, companyName: true } } },
  });
  if (!app || app.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { question } = await req.json() as { question: string; type: string };
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const companyCtx = app.companyType ? (COMPANY_TYPE_CONTEXT[app.companyType] ?? "") : "";

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      {
        role: "system",
        content: `你是一位很會帶學生上岸的面試教練，風格像實際待過業界的學長姐。
你不講空話、不講教科書，而是直接告訴使用者：「這題真正厲害的人會怎麼答。」

語言規範（嚴格遵守）：
- 全程繁體中文，台灣面試口語
- 不要有 AI 味，每句盡量短，可以有停頓感，偶爾補一句短句
- 禁用：通過、質量、積極主動、學習很多、溝通能力、團隊合作、讓我成長、空泛形容詞、官腔、過度雞湯`,
      },
      {
        role: "user",
        content: `面試題目：「${question}」
職缺：${app.jd.title}（${app.jd.companyName}）
${companyCtx ? `公司文化：${companyCtx}` : ""}

請輸出以下三個區塊，嚴格照格式：

### 90 分示範回答
120 字內，口語自然，不要分點，不要寫 STAR 標題。
開頭第一句一定要抓人（數字、衝突、反問、結果）。
中間一定要有一個具體細節（數字／情境／決策／失敗／突發狀況）。
結尾讓人感覺：「這個人做事有邏輯，而且知道自己在幹嘛。」
語氣像真實面試，有點緊張但很誠懇，不是演講，不是背稿。

### 為什麼這回答有 90 分
用 3 點拆解，重點是教回答邏輯，不是稱讚：
- 這句話為什麼讓面試官會繼續聽
- 哪個細節讓回答變真實
- 結尾為什麼讓人留下印象

### 你可以替換成自己經驗的地方
列出 2–3 個可替換的素材位置，格式像：
「XX 人的活動」可換成你實際參與的任何專案
讓使用者知道：不是背答案，而是套進自己的經歷。`,
      },
    ],
  });

  const modelAnswer = resp.choices[0].message.content?.trim() ?? "";
  return NextResponse.json({ modelAnswer });
}
