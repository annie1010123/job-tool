import Groq from "groq-sdk";

export type Tone = "formal" | "friendly" | "concise";

export interface WorkExperienceInput {
  type?: string; // 工作/實習/專案/社團/競賽/課程
  company: string;
  role: string;
  startDate: string | null;
  endDate: string | null;
  description: string;
  skills: string[];
}

interface GenerateInput {
  jdTitle: string;
  jdCompanyName: string;
  jdDescription: string | null;
  jdSkills: string[];
  workExperiences: WorkExperienceInput[];
  resumeTitle: string | null;
  resumeSeniority: string | null;
  tone: Tone;
}

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  formal: "語氣正式專業，使用敬語，結構完整（開頭問候→動機→匹配→結語）",
  friendly: "語氣親切自然，像寫信給未來的同事，展現熱情和個人特色",
  concise: "語氣簡潔有力，只講最關鍵的匹配點",
};

function formatExperiences(exps: WorkExperienceInput[]): string {
  return exps
    .map((e, i) => {
      const period = [e.startDate, e.endDate].filter(Boolean).join(" ～ ");
      const skillsStr = e.skills.length > 0 ? `\n  技能：${e.skills.join("、")}` : "";
      const typeLabel = e.type && e.type !== "工作" ? `${e.type}・` : "";
      return `【經歷 ${i + 1}・${typeLabel}】${e.company}｜${e.role}${period ? `（${period}）` : ""}
  ${e.description}${skillsStr}`;
    })
    .join("\n\n");
}

export async function generateCoverLetter(input: GenerateInput): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const jdSkills = input.jdSkills.join("、") || "未提供";
  const desc = input.jdDescription?.slice(0, 2000) ?? "未提供";
  const expBlock = input.workExperiences.length > 0
    ? formatExperiences(input.workExperiences)
    : "（尚未填寫工作經歷）";

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `你是一位專業的實習與求職申請顧問，專門協助台灣求職者撰寫高品質的自我推薦信。

請嚴格按以下結構撰寫：
1. 開頭：用一個具體的故事或洞察抓住注意力，展現求職者對該產業或公司的理解，而非套話
2. 中段：從求職者提供的經歷中，挑選最符合職缺需求的 2-3 段，用 STAR 法則呈現（情境→任務→行動→結果），每段都要明確連結到 JD 的要求或關鍵字。
   經歷可能是工作、實習、專案、社團、競賽或課程作品——一律平等看待，挑「最能證明能力」的，不限正式工作經歷。
3. 結尾：表達具體的貢獻意願，說明能為團隊帶來什麼，而非只說「我想學習」

語氣要求：${TONE_INSTRUCTIONS[input.tone]}
長度：400-600 字（繁體中文）
注意：
- 必須引用 JD 中的原文關鍵字，確保能通過 ATS 篩選
- 若求職者沒有正式工作經歷（學生／新鮮人），以最相關的專案／競賽／實習經歷為主，強調可遷移能力，不要自我貶低
- 若有豐富工作經歷（轉職／資深），聚焦最相關的職務成果與量化績效
- 不要寫「我是一個熱愛學習的人」等空泛套話
- 不要加標題、日期或「此致」等格式，直接從正文開始
- 若工作經歷中有量化數字（%、倍數、金額），務必保留`,
      },
      {
        role: "user",
        content: `請根據以下資訊撰寫推薦信：

【應徵職缺】${input.jdTitle}
【公司名稱】${input.jdCompanyName}
【職缺技能要求】${jdSkills}
【職缺描述】
${desc}

【求職者資料】
- 職稱：${input.resumeTitle ?? "未提供"}
- 資歷等級：${input.resumeSeniority ?? "未提供"}

【求職者經歷（工作／實習／專案／社團／競賽皆可，請從中挑最相關的 2-3 段）】
${expBlock}

請直接輸出推薦信正文。`,
      },
    ],
  });

  return resp.choices[0].message.content?.trim() ?? "";
}

export async function generateCoverLetterFromJdOnly(jdText: string, tone: Tone = "formal"): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `你是一位資深求職顧問。根據職缺描述，撰寫一封通用但有針對性的推薦信範本。
${TONE_INSTRUCTIONS[tone]}
用繁體中文，400-600 字。不要加標題或日期。將需要求職者填入的部分用 [你的XX經驗] 標記。`,
      },
      {
        role: "user",
        content: `請根據以下職缺描述撰寫推薦信範本：\n\n${jdText.slice(0, 3000)}`,
      },
    ],
  });

  return resp.choices[0].message.content?.trim() ?? "";
}
