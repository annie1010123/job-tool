// 策展核心題（萬年通用、每場面試都可能問）。純資料，無 LLM。
// coreKey 為穩定識別，對應 QuestionBank.coreKey（每位使用者每個 coreKey 唯一）。

export interface CoreQuestion {
  coreKey: string;
  question: string;
  category: "behavioral" | "motivation" | "situational" | "technical";
  hint: string;
  defaultVersions: string[];
}

export const CORE_QUESTIONS: CoreQuestion[] = [
  {
    coreKey: "self_intro",
    question: "請做一個簡短的自我介紹。",
    category: "behavioral",
    hint: "一句定位 ＋ 一個最有力的成果（最好有數字）＋ 一句為什麼想來。打中重點，不貪多。",
    defaultVersions: ["30秒", "1分鐘"],
  },
  {
    coreKey: "biggest_setback",
    question: "你遇過最大的挫折是什麼？你如何面對？",
    category: "behavioral",
    hint: "用 STAR；挫折要真實，重點放在你怎麼面對與學到什麼，要有具體結果。",
    defaultVersions: ["我的版本"],
  },
  {
    coreKey: "problem_solving",
    question: "分享一次你解決問題的經驗。",
    category: "behavioral",
    hint: "情境→任務→行動→結果；行動要具體、結果要量化。",
    defaultVersions: ["我的版本"],
  },
  {
    coreKey: "team_difficulty",
    question: "在團隊合作中，你遇過最大的困難是什麼？",
    category: "behavioral",
    hint: "聚焦你的角色與具體作法，避免抱怨他人。",
    defaultVersions: ["我的版本"],
  },
  {
    coreKey: "why_us",
    question: "為什麼想加入我們？",
    category: "motivation",
    hint: "連結你的目標與這家公司具體的產品/做法，不要泛泛而談。",
    defaultVersions: ["我的版本"],
  },
  {
    coreKey: "strength_weakness",
    question: "你最大的優點和缺點是什麼？",
    category: "behavioral",
    hint: "優點佐證一個例子；缺點要真實 ＋ 你正在怎麼改善。",
    defaultVersions: ["我的版本"],
  },
];
