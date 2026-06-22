// 答案教練引擎：評估使用者的面試答案、生成初稿。
// v1 先用 Groq（llama-3.3-70b）跑；之後要換 Claude（品質更好）只需改本檔的呼叫，介面不變。
import Groq from "groq-sdk";
import { z } from "zod";

export const CoachResultSchema = z.object({
  grade: z.enum(["needs_improvement", "ok", "good"]),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(
    z.object({
      issue: z.string(), // 指名哪一句/哪裡的問題
      suggestion: z.string(), // 怎麼改
      example: z.string(), // 一句可貼上的示範改寫
    }),
  ),
  structure: z.array(z.object({ label: z.string(), ok: z.boolean() })), // e.g. 定位/成果/動機 或 S/T/A/R
});
export type CoachResult = z.infer<typeof CoachResultSchema>;

/** 純函式：清理 ```json fence → JSON.parse → schema 驗證。壞 JSON 會 throw（呼叫端 fallback）。 */
export function parseCoachJson(raw: string): CoachResult {
  const clean = raw.replace(/```json|```/g, "").trim();
  const obj: unknown = JSON.parse(clean);
  return CoachResultSchema.parse(obj);
}

const MODEL = "llama-3.3-70b-versatile";
function groq(): Groq {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const COACH_SYSTEM = `你是一位擁有 10 年經驗的資深面試官，同時是面試教練。你要評估求職者對某一題的答案，給出可執行的回饋。

嚴格要求：
1. 評等三級：needs_improvement（空泛/離題/缺關鍵資訊）、ok（方向對但缺細節）、good（具體、有邏輯、有量化佐證）。
2. 「可以更好」每一點都要：指名是答案中的哪一句或哪個部分（issue）、具體怎麼改（suggestion）、以及一句可以直接貼上的示範改寫（example）。不要給空泛建議。
3. 行為題請用 STAR 檢查（情境/任務/行動/結果）；自我介紹用 定位/成果/動機 檢查，填入 structure。
4. 不要幫使用者捏造數字或事實；若該補數字，請在 example 用「◯◯」留空讓他填。
5. 用繁體中文。只輸出 JSON，不要任何 markdown 或說明文字。

輸出 JSON 格式：
{"grade":"needs_improvement|ok|good","summary":"一句總評","strengths":["..."],"improvements":[{"issue":"...","suggestion":"...","example":"..."}],"structure":[{"label":"定位","ok":true}]}`;

function fallbackResult(note?: string): CoachResult {
  return {
    grade: "ok",
    summary: note ? `教練暫時無法完成評估（${note}），請稍後再試。` : "教練暫時無法完成評估，請稍後再試。",
    strengths: [],
    improvements: [],
    structure: [],
  };
}

export async function coachAnswer(input: {
  question: string;
  answer: string;
  category: string;
  resumeContext?: string;
}): Promise<CoachResult> {
  const userMsg = `【題目】${input.question}
【題型】${input.category}
${input.resumeContext ? `【求職者背景摘要】${input.resumeContext.slice(0, 1500)}` : ""}

【求職者的答案】
${input.answer.slice(0, 3000)}

請依系統指示評估，只輸出 JSON。`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await groq().chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 1500,
        messages: [
          { role: "system", content: COACH_SYSTEM },
          { role: "user", content: userMsg },
        ],
      });
      return parseCoachJson(resp.choices[0]?.message?.content ?? "");
    } catch (err) {
      if (attempt === 1) return fallbackResult(err instanceof Error ? err.message : undefined);
    }
  }
  return fallbackResult();
}

const DRAFT_SYSTEM = `你是面試教練。請根據題目與求職者的背景，幫他寫一版「起點初稿」答案（繁體中文）。
要求：具體、可直接編輯；若需要數字但背景沒提供，用「◯◯」留空讓他填；不要捏造事實。只輸出答案本文，不要前後說明。`;

export async function draftAnswer(input: {
  question: string;
  hint: string;
  resumeContext?: string;
}): Promise<string> {
  const userMsg = `【題目】${input.question}
【答題方向】${input.hint}
${input.resumeContext ? `【求職者背景摘要】${input.resumeContext.slice(0, 1500)}` : "（求職者尚未提供背景，請給一個通用但具體的起點，並用〔〕標出他需要替換的地方）"}

請寫一版初稿，只輸出答案本文。`;

  try {
    const resp = await groq().chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        { role: "system", content: DRAFT_SYSTEM },
        { role: "user", content: userMsg },
      ],
    });
    return (resp.choices[0]?.message?.content ?? "").trim();
  } catch {
    return "";
  }
}
