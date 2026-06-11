import Groq from "groq-sdk";

export async function expandIntent(rawInput: string): Promise<string[]> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set — returning raw input as single keyword");
    return [rawInput];
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `你是台灣求職搜尋助手。把使用者的求職意圖展開成 10~14 個搜尋關鍵字（JSON array），用於比對 104 職缺標題與描述。
包含：職稱變體（2~3 個）、核心技能與工具（4~6 個）、工作內容關鍵詞（3~4 個）。
只輸出 JSON array，不要 markdown 或解釋。
例："PM 實習生" → ["專案管理實習","Project Manager Intern","產品管理實習","PRD","需求分析","時程控管","Agile","Scrum","利害關係人溝通","產品規格","專案追蹤"]`,
      },
      { role: "user", content: rawInput },
    ],
  });

  const text = resp.choices[0].message.content ?? "[]";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const keywords = JSON.parse(clean);
    if (Array.isArray(keywords) && keywords.length >= 4) return keywords;
    return [rawInput];
  } catch {
    return [rawInput];
  }
}
