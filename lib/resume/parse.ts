import Groq from "groq-sdk";

export interface ParsedResume {
  title: string | null;
  seniority: string | null;
  industry: string | null;
  skills: string[];
  yearsExperience: number | null;
}

export async function parseResumeText(pdfBuffer: Buffer): Promise<{ rawText: string; parsed: ParsedResume }> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });
  const { text: rawText } = await parser.getText();

  const parsed = await structureWithGroq(rawText);
  return { rawText, parsed };
}

async function structureWithGroq(resumeText: string): Promise<ParsedResume> {
  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not set — returning empty parsed resume");
    return { title: null, seniority: null, industry: null, skills: [], yearsExperience: null };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `你是履歷解析助手。從履歷文字中抽取以下資訊，只輸出 JSON，不要其他說明。

輸出格式：
{
  "title": "職稱 (e.g. 後端工程師, 行銷專員, null if unknown)",
  "seniority": "junior|mid|senior|intern|null",
  "industry": "主要產業 (e.g. 科技業, 金融業, null if unknown)",
  "skills": ["技能1", "技能2", ...最多15個],
  "yearsExperience": 數字或null
}`,
      },
      {
        role: "user",
        content: resumeText.slice(0, 8000),
      },
    ],
  });

  const text = resp.choices[0].message.content ?? "{}";
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as ParsedResume;
  } catch {
    console.warn("Failed to parse Groq response:", text.slice(0, 200));
    return { title: null, seniority: null, industry: null, skills: [], yearsExperience: null };
  }
}
