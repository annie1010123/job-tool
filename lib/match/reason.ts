import Groq from "groq-sdk";

export interface JobContext {
  jdId: string;
  title: string;
  companyName: string;
  skills: string[];
  seniority: string | null;
}

export interface ReasonResult {
  jdId: string;
  reason: string;
  alignedSkills: string[];
  fitScore: number; // 0-10：與求職者意圖的職類適配度（工程師/行政等不同職類 → 低分）
}

export async function generateReasons(
  intentRaw: string,
  jobs: JobContext[]
): Promise<ReasonResult[]> {
  if (!process.env.GROQ_API_KEY || jobs.length === 0) {
    // 無 LLM 時 fallback：給中性分 6，不影響原排序
    return jobs.map((j) => ({ jdId: j.jdId, reason: "", alignedSkills: [], fitScore: 6 }));
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const jobList = jobs
    .map((j, i) =>
      `${i + 1}. [${j.jdId}] ${j.title} @ ${j.companyName}` +
      (j.seniority ? `（${j.seniority}）` : "") +
      (j.skills.length > 0 ? ` 技能：${j.skills.slice(0, 5).join("、")}` : "")
    )
    .join("\n");

  const prompt = `求職者意圖：「${intentRaw}」

以下是 ${jobs.length} 個候選職缺：
${jobList}

請為每個職缺做兩件事：
1. fitScore（0-10）：這份職缺的「職類」與求職者意圖的相符程度。
   - 職類相同且高度相關 → 8-10
   - 沾邊但職類不同（如求職者要產品/專案管理，卻是研發工程師、行政、業務、設計） → 2-4
   - 完全不相關 → 0-1
   - 重點看「職務本質」，不要被標題裡的「管理」「專案」等字眼誤導（例：「可靠度項目管理工程師」本質是工程師，應給低分）
2. reason：一句繁體中文推薦理由（≤30字）+ 最多 3 個對齊技能。

只輸出 JSON array，格式：[{"jdId":"...","fitScore":8,"reason":"...","alignedSkills":["技能1","技能2"]}]
不要任何解釋或 markdown。`;

  try {
    const resp = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "你是台灣求職推薦助手，輸出純 JSON，不加任何解釋。",
        },
        { role: "user", content: prompt },
      ],
    });

    const text = resp.choices[0].message.content ?? "[]";
    const clean = text.replace(/```json|```/g, "").trim();
    const raw = JSON.parse(clean) as Array<Partial<ReasonResult>>;

    if (Array.isArray(raw)) {
      return raw.map((r) => ({
        // LLM 常把 prompt 裡的 [jdId] 連中括號一起 echo 回來，去掉才對得上 reasonMap
        jdId: String(r.jdId ?? "").replace(/[[\]]/g, "").trim(),
        reason: r.reason ?? "",
        alignedSkills: Array.isArray(r.alignedSkills) ? r.alignedSkills : [],
        fitScore: typeof r.fitScore === "number" ? Math.max(0, Math.min(10, r.fitScore)) : 6,
      }));
    }
    return jobs.map((j) => ({ jdId: j.jdId, reason: "", alignedSkills: [], fitScore: 6 }));
  } catch {
    return jobs.map((j) => ({ jdId: j.jdId, reason: "", alignedSkills: [], fitScore: 6 }));
  }
}
