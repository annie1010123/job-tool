import Groq from "groq-sdk";

export type Tone = "formal" | "friendly" | "concise";

interface GenerateInput {
  jdTitle: string;
  jdCompanyName: string;
  jdDescription: string | null;
  jdSkills: string[];
  resumeTitle: string | null;
  resumeSkills: string[];
  resumeSeniority: string | null;
  tone: Tone;
}

const TONE_INSTRUCTIONS: Record<Tone, string> = {
  formal: "語氣正式專業，使用敬語，結構完整（開頭問候→動機→匹配→結語）",
  friendly: "語氣親切自然，像寫信給未來的同事，展現熱情和個人特色",
  concise: "語氣簡潔有力，不超過 200 字，只講最關鍵的匹配點",
};

export async function generateCoverLetter(input: GenerateInput): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const skills = input.jdSkills.join("、") || "未提供";
  const resumeSkills = input.resumeSkills.join("、") || "未提供";
  const desc = input.jdDescription?.slice(0, 2000) ?? "未提供";

  const resp = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `你是一位資深求職顧問，擅長撰寫台灣求職者的推薦信（自薦信/Cover Letter）。
你會根據求職者的履歷和職缺 JD，寫出一封讓 HR 想繼續看下去的推薦信。

寫作要求：
1. ${TONE_INSTRUCTIONS[input.tone]}
2. 必須具體提到 JD 中的職責或技能，並對應到求職者的經驗
3. 不要寫「我是一個熱愛學習的人」等空泛描述
4. 用繁體中文
5. 長度 300-500 字（concise 模式 200 字以內）
6. 不要加標題或日期，直接從正文開始`,
      },
      {
        role: "user",
        content: `請根據以下資訊撰寫推薦信：

【應徵職缺】${input.jdTitle}
【公司名稱】${input.jdCompanyName}
【職缺技能要求】${skills}
【職缺描述】${desc}

【求職者背景】
- 職稱：${input.resumeTitle ?? "未提供"}
- 經歷等級：${input.resumeSeniority ?? "未提供"}
- 技能：${resumeSkills}

請直接輸出推薦信正文，不要加任何說明。`,
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
用繁體中文，300-500 字。不要加標題或日期。將需要求職者填入的部分用 [你的XX經驗] 標記。`,
      },
      {
        role: "user",
        content: `請根據以下職缺描述撰寫推薦信範本：\n\n${jdText.slice(0, 3000)}`,
      },
    ],
  });

  return resp.choices[0].message.content?.trim() ?? "";
}
