import Groq from "groq-sdk";

export interface ExpandedIntent {
  keywords: string[];      // 全部關鍵字（embedding + 排序加分用）
  roleKeywords: string[];  // 角色/職稱關鍵字（爬蟲搜尋 + 候選門票用）
}

export async function expandIntent(rawInput: string): Promise<ExpandedIntent> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set — returning raw input as single keyword");
    return { keywords: [rawInput], roleKeywords: [rawInput] };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `你是台灣求職搜尋助手。把使用者的求職意圖展開成搜尋關鍵字，並分成兩類：

1. roleKeywords（3~5 個）：「職稱/職種」關鍵字，用來搜尋職缺。只放能代表「這個職位是什麼」的詞，含中英職稱變體與受僱型態（如實習）。
   ⚠️ 絕對不要放技能或工具（PRD、Agile、Excel、需求分析…），因為那些詞工程師、行政都會用，會撈到不同職種。
2. keywords（共 10~14 個）：roleKeywords + 核心技能與工作內容關鍵詞，用於比對職缺內容、加分排序。

只輸出 JSON 物件，不要 markdown 或解釋。
例："PM 實習生" → {"roleKeywords":["專案管理實習","Project Manager Intern","產品經理實習","PM 實習生"],"keywords":["專案管理實習","Project Manager Intern","產品經理實習","PM 實習生","PRD","需求分析","時程控管","Agile","Scrum","利害關係人溝通","產品規格","專案追蹤"]}
例："行銷實習生" → {"roleKeywords":["行銷實習","Marketing Intern","數位行銷實習","社群行銷實習"],"keywords":["行銷實習","Marketing Intern","數位行銷實習","社群行銷實習","SEO","Google Analytics","內容行銷","社群經營","廣告投放","文案","活動企劃"]}`,
      },
      { role: "user", content: rawInput },
    ],
  });

  const text = resp.choices[0].message.content ?? "{}";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean) as { keywords?: unknown; roleKeywords?: unknown };
    const keywords = Array.isArray(parsed.keywords) ? (parsed.keywords as string[]).filter(Boolean) : [];
    const roleKeywords = Array.isArray(parsed.roleKeywords) ? (parsed.roleKeywords as string[]).filter(Boolean) : [];
    if (keywords.length >= 4) {
      // roleKeywords 萬一空了，fallback 用 rawInput，至少能搜
      return { keywords, roleKeywords: roleKeywords.length > 0 ? roleKeywords : [rawInput] };
    }
    return { keywords: [rawInput], roleKeywords: [rawInput] };
  } catch {
    return { keywords: [rawInput], roleKeywords: [rawInput] };
  }
}
