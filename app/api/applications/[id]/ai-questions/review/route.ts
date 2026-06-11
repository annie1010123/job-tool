import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import Groq from "groq-sdk";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    select: {
      userId: true,
      companyType: true,
      jd: { select: { title: true, companyName: true, description: true, skills: true } },
    },
  });
  if (!app || app.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { question, answer, type } = await req.json() as { question: string; answer: string; type: string };
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const jd = app.jd;
  const skills = (jd.skills as string[]).join("、") || "";
  const description = jd.description?.slice(0, 1500) ?? "";
  const hasUserDraft = answer && answer.trim().length > 0;

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.5,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `你是一位擁有 10 年以上經驗的資深面試官與職涯導師，曾協助數百位學生成功錄取頂尖企業的「產品經理 / 商業分析 / 營運相關」理想實習。你非常擅長從複雜的職缺描述中抓出關鍵字，並用 STAR 原則將零散的專案經歷包裝成最吸引面試官的「戰功」。

語言規範（嚴格遵守）：
- 全程繁體中文，台灣面試口語
- 禁用：通過、質量、積極主動、學習很多、溝通能力、團隊合作佳
- 語氣專業、自信、結果導向`,
      },
      {
        role: "user",
        content: `目標職缺：${jd.title}（${jd.companyName}）
職缺要求技能：${skills || "未提供"}
職缺描述：${description || "未提供"}

面試題目（${type}）：「${question}」
${hasUserDraft ? `使用者草稿：「${answer}」` : "（使用者尚未提供草稿，請直接模擬示範）"}

請根據上方 JD 資訊，從職缺描述中找出與這題最相關的 2 項核心技能，並嚴格按以下格式輸出：

---

### 🎯 核心技能分析
比對 JD 與這題，指出 2 項決勝關鍵技能，各用一句說明為何重要。

---

### 🎯 核心技能 1：[填入技能名稱]
*為什麼重要：[與 JD 的關聯]*

* **情境 (Situation)**：[一兩句點出痛點或挑戰，引人入勝${hasUserDraft ? "（融入使用者草稿的素材）" : "（模擬合理情境）"}]
* **任務 (Task)**：[具體目標，盡量量化]
* **行動 (Action)**：[著重「我」做了什麼、思考邏輯、工具方法，避免模糊]
* **結果 (Result)**：[用數據、百分比或前後對比量化成果]

---

### 🎯 核心技能 2：[填入技能名稱]
*為什麼重要：[與 JD 的關聯]*

* **情境 (Situation)**：...
* **任務 (Task)**：...
* **行動 (Action)**：...
* **結果 (Result)**：...

---

### 💡 你可以替換的地方
${hasUserDraft
  ? "根據使用者草稿，列出 2–3 個可以用自己真實經歷替換的素材位置。格式：「XX」→ 可換成你實際的 OO"
  : "列出 2–3 個模擬故事中可替換成個人真實經歷的位置。讓使用者知道：不是背答案，而是套進自己的經歷。"}`,
      },
    ],
  });

  const tip = resp.choices[0].message.content?.trim() ?? "";
  return NextResponse.json({ tip });
}
