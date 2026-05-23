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
}

export async function generateReasons(
  intentRaw: string,
  jobs: JobContext[]
): Promise<ReasonResult[]> {
  if (!process.env.GROQ_API_KEY || jobs.length === 0) {
    return jobs.map((j) => ({ jdId: j.jdId, reason: "", alignedSkills: [] }));
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

以下是 ${jobs.length} 個推薦職缺：
${jobList}

為每個職缺寫一句繁體中文推薦理由（≤30字），說明為何符合求職者意圖，並列出最多 3 個對齊技能。
只輸出 JSON array，格式：[{"jdId":"...","reason":"...","alignedSkills":["技能1","技能2"]}]
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
    const results: ReasonResult[] = JSON.parse(clean);

    if (Array.isArray(results)) return results;
    return jobs.map((j) => ({ jdId: j.jdId, reason: "", alignedSkills: [] }));
  } catch {
    return jobs.map((j) => ({ jdId: j.jdId, reason: "", alignedSkills: [] }));
  }
}
