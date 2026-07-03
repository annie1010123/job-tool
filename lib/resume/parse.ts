import Groq from "groq-sdk";

export interface ParsedResume {
  title: string | null;
  seniority: string | null;
  industry: string | null;
  skills: string[];
  yearsExperience: number | null;
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = new pdfjs.PDFWorker({ port: null });
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer), worker }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += (content.items as Array<{ str: string }>).map((item) => item.str).join(" ") + "\n";
    }
    await doc.destroy();
    return text;
  } finally {
    worker.destroy();
  }
}

export async function parseResumeText(pdfBuffer: Buffer): Promise<{ rawText: string; parsed: ParsedResume }> {
  const rawText = await extractTextFromPdf(pdfBuffer);
  const parsed = await structureWithGroq(rawText);
  return { rawText, parsed };
}

export async function pdfToText(pdfBuffer: Buffer): Promise<string> {
  return extractTextFromPdf(pdfBuffer);
}

export interface ExtractedExperience {
  type: string; // 工作/實習/專案/社團/競賽/課程
  company: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  bullets: string[];
  skills: string[];
}

/** 從履歷或經歷文字中抽出「多筆結構化經歷」，給個人檔案快速匯入用 */
export async function extractExperiences(text: string): Promise<ExtractedExperience[]> {
  if (!process.env.GROQ_API_KEY || !text.trim()) return [];

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0,
    max_tokens: 4000,
    messages: [
      {
        role: "system",
        content: `你是履歷解析助手。從使用者貼上的履歷／經歷文字中，抽出每一段「經歷」成結構化資料。

每段經歷包含：
- type：工作 / 實習 / 專案 / 社團 / 競賽 / 課程（依內容判斷，無法判斷給「專案」）
- company：公司／組織／專案名稱
- role：職稱／角色
- startDate, endDate："YYYY/MM" 格式，無法判斷給 null（在職中 endDate 給 "現在"）
- bullets：字串陣列，每一條是一個獨立的經歷重點（做了什麼 + 成果），這些會作為面試素材
- skills：該段用到的技能／工具（最多 6 個）

bullets 的規則（非常重要）：
- 每一條 bullet 是一個獨立的行動 + 成果，不要把多件事合在同一條
- 保留原文的量化數字（例：450+ 份問卷、90%、15+ 用戶）
- 保留原文的動詞開頭語氣（例：「領導」「分析」「設計」「建置」）
- 不要過度精簡或杜撰，盡量忠於原文
- 每段經歷通常有 2-5 條 bullets

其他規則：
- 把學生的專案／社團／競賽也視為經歷抽出來，不要只抽正式工作
- 只輸出 JSON array，不要任何說明或 markdown
格式：[{"type":"...","company":"...","role":"...","startDate":null,"endDate":null,"bullets":["...","..."],"skills":[]}]`,
      },
      { role: "user", content: text.slice(0, 9000) },
    ],
  });

  try {
    const clean = (resp.choices[0].message.content ?? "[]").replace(/```json|```/g, "").trim();
    const raw = JSON.parse(clean) as Array<Partial<ExtractedExperience>>;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((e) => e.company && e.role && (e.bullets?.length || e.description))
      .map((e) => {
        const bullets = Array.isArray(e.bullets) ? e.bullets.map((b) => String(b).trim()).filter(Boolean) : [];
        return {
          type: e.type?.trim() || "專案",
          company: String(e.company).trim(),
          role: String(e.role).trim(),
          startDate: e.startDate?.trim() || null,
          endDate: e.endDate?.trim() || null,
          description: bullets.length > 0 ? bullets.join("\n") : String(e.description ?? "").trim(),
          bullets,
          skills: Array.isArray(e.skills) ? e.skills.slice(0, 6) : [],
        };
      });
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
