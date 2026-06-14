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

export async function pdfToText(pdfBuffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });
  const { text } = await parser.getText();
  return text;
}

export interface ExtractedExperience {
  type: string; // 工作/實習/專案/社團/競賽/課程
  company: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  skills: string[];
}

/** 從履歷或經歷文字中抽出「多筆結構化經歷」，給個人檔案快速匯入用 */
export async function extractExperiences(text: string): Promise<ExtractedExperience[]> {
  if (!process.env.GROQ_API_KEY || !text.trim()) return [];

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 2500,
    messages: [
      {
        role: "system",
        content: `你是履歷解析助手。從使用者貼上的履歷／經歷文字中，抽出每一段「經歷」成結構化資料。

每段經歷包含：
- type：工作 / 實習 / 專案 / 社團 / 競賽 / 課程（依內容判斷，無法判斷給「工作」）
- company：公司／組織／專案名稱
- role：職稱／角色
- startDate, endDate："YYYY/MM" 格式，無法判斷給 null（在職中 endDate 給 "現在"）
- description：用條列或 STAR 描述做了什麼、成果（保留原文的量化數字）
- skills：該段用到的技能／工具（最多 6 個）

規則：
- 把學生的專案／社團／競賽也視為經歷抽出來，不要只抽正式工作
- description 盡量保留原文重點，不要過度精簡或杜撰
- 只輸出 JSON array，不要任何說明或 markdown
格式：[{"type":"...","company":"...","role":"...","startDate":null,"endDate":null,"description":"...","skills":[]}]`,
      },
      { role: "user", content: text.slice(0, 9000) },
    ],
  });

  try {
    const clean = (resp.choices[0].message.content ?? "[]").replace(/```json|```/g, "").trim();
    const raw = JSON.parse(clean) as Partial<ExtractedExperience>[];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e.company && e.role && e.description)
      .map((e) => ({
        type: e.type?.trim() || "工作",
        company: String(e.company).trim(),
        role: String(e.role).trim(),
        startDate: e.startDate?.trim() || null,
        endDate: e.endDate?.trim() || null,
        description: String(e.description).trim(),
        skills: Array.isArray(e.skills) ? e.skills.slice(0, 6) : [],
      }));
  } catch {
    return [];
  }
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
