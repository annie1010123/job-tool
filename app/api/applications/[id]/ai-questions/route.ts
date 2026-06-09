import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import Groq from "groq-sdk";

export interface AiQuestion {
  question: string;
  type: "行為題" | "技術題" | "動機題" | "情境題";
  prepared: boolean;
  fromHistory: boolean;
  relatedCompany: string | null;
  previousPerformance: string | null;
  improvementTip: string | null;
}

const COMPANY_TYPE_HINT: Record<string, string> = {
  startup: "新創公司，多出開放式情境題、文化契合度題，少 STAR 結構要求",
  large: "大型企業，多出 STAR 結構行為題、流程/跨部門協作題",
  traditional: "傳統產業，多出產業認識題、穩定性動機題、公司文化適應題",
};

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: { jd: { select: { title: true, companyName: true, description: true, skills: true } } },
  });
  if (!app || app.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const jd = app.jd;
  const companyTypeHint = app.companyType ? (COMPANY_TYPE_HINT[app.companyType] ?? "") : "";

  const questionBank = await prisma.questionBank.findMany({
    where: { userId: session.user.id },
    orderBy: { frequency: "desc" },
    take: 20,
  });

  const historySection = questionBank.length > 0
    ? `\n\n【歷史面試題庫（這位求職者過去真實被問過的題目）】
${questionBank.map((q) => `- [${q.category}] ${q.question}（表現：${q.userPerformance ?? "未評"}，出現 ${q.frequency} 次）`).join("\n")}

請根據以上歷史題庫：
1. 如果有與本次 JD 相關的歷史題目，優先納入並標記 "fromHistory": true
2. 針對表現為 needs_improvement 的題型，出類似但稍微變化的題目幫助練習
3. 至少 30% 的題目從歷史題庫延伸`
    : "";

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const skills = (jd.skills as string[]).join("、") || "未提供";
  const description = jd.description?.slice(0, 2500) ?? "未提供";

  const systemMessage = `你是一位擁有 10 年經驗的面試官，專門協助求職者做面試準備。
你熟悉台灣各類企業的面試文化，能根據 JD 內容產出高品質、針對性強的面試題。

高品質面試題的標準：
1. 具體性：題目必須直接扣合 JD 中提到的職責、技術或情境，不出泛泛的通用題
2. 深度：一題能讓面試官看出候選人的思維邏輯與實際能力
3. 真實性：這是真正有經驗的面試官會問的題目，不是教科書範例
4. 用繁體中文，口吻自然，像真人面試官在問話`;

  const userMessage = `請根據以下職缺資訊，產出 10～12 題面試官最可能問的問題。

【職缺】${jd.title}
【公司】${jd.companyName}
${companyTypeHint ? `【公司類型】${companyTypeHint}` : ""}
【技能要求】${skills}
【職缺描述】
${description}

---

題型定義（分類時嚴格遵守）：
- 行為題：問「你過去曾經如何⋯」，考驗真實經驗，用 STAR 法則回答。例：請描述一次你處理衝突的經驗。
- 情境題：給假設情境「如果⋯你會怎麼做」，考驗應變思維。例：如果候選人臨時取消面試你如何處理？
- 技術題：考驗特定工具、方法、知識的具體掌握程度。例：請說明你用過哪些數據分析工具及實際應用。
- 動機題：問為什麼選擇這份工作/公司/產業，考驗價值觀與目標。例：你如何看待這份職缺的發展性？為什麼想加入我們？

題型數量（依公司類型調整）：
- 行為題：3～4 題
- 情境題：2～3 題
- 技術題：2～3 題（JD 無明確技術要求則減少）
- 動機題：1～2 題
${companyTypeHint ? "（依上方公司類型提示調整各題型比例）" : ""}

出題要求：
- 必須直接引用 JD 中的具體內容（職責、工具、情境），不出「請自我介紹」等通用題
- 行為題指定具體場景，例如「JD 提到你需要跨部門協調，請描述一次你如何⋯」
- 技術題針對 JD 列出的技能出考點，不出籠統的「你對 XX 了解多少？」
- 情境題設計貼近這份工作的真實挑戰
- 每題 20～60 字，問法清晰直接

只輸出 JSON array，不含任何 markdown 或說明文字：
[{"question":"問題（繁體中文）","type":"行為題|技術題|動機題|情境題","prepared":false,"fromHistory":false,"relatedCompany":null,"previousPerformance":null,"improvementTip":null}]${historySection}`;

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.5,
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
  });

  const text = resp.choices[0].message.content ?? "[]";
  let questions: AiQuestion[] = [];
  try {
    const raw = JSON.parse(text.replace(/```json|```/g, "").trim()) as AiQuestion[];
    questions = raw.map((q) => ({
      question: q.question,
      type: q.type ?? "行為題",
      prepared: false,
      fromHistory: q.fromHistory ?? false,
      relatedCompany: q.relatedCompany ?? null,
      previousPerformance: q.previousPerformance ?? null,
      improvementTip: q.improvementTip ?? null,
    }));
  } catch {
    questions = [];
  }

  await prisma.application.update({
    where: { id },
    data: { aiQuestions: questions as unknown as Prisma.JsonArray },
  });

  return NextResponse.json({ questions });
}
