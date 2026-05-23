import Groq from "groq-sdk";

export async function expandIntent(rawInput: string): Promise<string[]> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set — returning raw input as single keyword");
    return [rawInput];
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `你是台灣求職搜尋助手。把使用者的求職意圖展開成 8~12 個繁體中文搜尋關鍵字，供 104 人力銀行使用。
只輸出 JSON array of strings，不要任何解釋或 markdown。
例："前端工程師，想做 SaaS" → ["前端工程師","Frontend Engineer","React","Vue","TypeScript","SaaS前端","網頁工程師","UI工程師"]`,
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
