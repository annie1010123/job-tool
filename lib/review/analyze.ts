import Groq from "groq-sdk";

export interface ExtractedQA {
  question: string;
  answer_summary: string;
  quality: "good" | "ok" | "needs_improvement";
  improvement_tip: string;
  category: "behavioral" | "technical" | "system_design" | "culture_fit" | "other";
}

export interface ReviewAnalysis {
  extractedQA: ExtractedQA[];
  overallFeedback: string;
}

export async function analyzeInterview(transcript: string): Promise<ReviewAnalysis> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: 3000,
    messages: [
      {
        role: "system",
        content: `你是面試復盤教練。分析面試逐字稿，萃取每個 Q&A，評估回答品質，給出改善建議。

輸出格式（只輸出 JSON，不要 markdown）：
{
  "extractedQA": [
    {
      "question": "面試官問的問題",
      "answer_summary": "求職者回答的摘要（50字內）",
      "quality": "good|ok|needs_improvement",
      "improvement_tip": "具體改善建議（30字內）",
      "category": "behavioral|technical|system_design|culture_fit|other"
    }
  ],
  "overallFeedback": "整體表現摘要 + 3 個最重要的改善重點（150字內）"
}

品質判斷標準：
- good：回答具體、有邏輯、有實例佐證
- ok：回答方向正確但缺少具體細節
- needs_improvement：回答空泛、離題、或缺少關鍵資訊`,
      },
      {
        role: "user",
        content: `請分析以下面試逐字稿：\n\n${transcript.slice(0, 8000)}`,
      },
    ],
  });

  const text = resp.choices[0].message.content ?? "{}";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as ReviewAnalysis;
  } catch {
    return { extractedQA: [], overallFeedback: "分析失敗，請重試" };
  }
}

export async function analyzeManualInput(questions: Array<{ question: string; answer: string; selfRating: string }>): Promise<ReviewAnalysis> {
  const transcript = questions
    .map((q, i) => `Q${i + 1}: ${q.question}\nA: ${q.answer}\n自評: ${q.selfRating}`)
    .join("\n\n");

  return analyzeInterview(transcript);
}
