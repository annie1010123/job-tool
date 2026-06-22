# 面試準備（答案教練 + 題庫）Implementation Plan — Phase 1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 讓使用者在「面試準備」頁練核心題：寫答案 → AI 教練評估（評等＋建議＋示範句）→ 存成可複用的多版本答案；並把真實面試被問的題累積成「常被問到」考古題。

**Architecture:** Next.js App Router 頁面 `/interview` + 一組 `/api/interview/*` route + `lib/interview/*` 邏輯；資料存 PostgreSQL（Prisma）。答案教練呼叫 Claude API（品質＝差異化），其餘廉價任務沿用 Groq。

**Tech Stack:** Next 16.2.6 / React 19 / Prisma 7 (+adapter-pg) / PostgreSQL(Supabase,pgvector) / Anthropic SDK（新增）/ groq-sdk（既有）/ zod / vitest。

## Global Constraints（逐字取自 CLAUDE.md / AGENTS.md，每個 task 都適用）
- **禁止 `any`**，未知用 `unknown` + type guard；API response 用 `zod` 定義並嚴格驗證。
- 系統邊界（API/DB/LLM/crawler）一律處理錯誤，**禁止空 catch**；LLM 失敗 retry 一次再 fallback。
- 每個新功能至少 1 個 integration test；LLM 相關用 **fixture（recorded response）** 測。
- commit 格式 `type: description`，描述寫「為什麼」，每完成一個 ticket 即 commit。
- **AGENTS.md：這版 Next.js 與訓練資料不同 → 寫任何 route/page 前，先讀 `node_modules/next/dist/docs/` 與**鏡像既有檔案**（如 `app/api/applications/[id]/route.ts`、`app/board/[applicationId]/_components/AiQuestionsEvolved.tsx`）的寫法，不要憑記憶寫。**
- UI 標記/樣式以 mockup 為準：`docs/mockups/interview-prep.html`。
- Prisma client 一律 `import { prisma } from "@/lib/db/client"`（lazy proxy）。
- 分支：在 `feature/interview-coach` 上做。

## 檔案地圖
- `prisma/schema.prisma` — 擴充 `QuestionBank` + 新 model `AnswerVersion`
- `lib/interview/core-questions.ts` — 策展核心題 seed（純資料）
- `lib/interview/coach.ts` — 教練評估 + 初稿生成（Anthropic SDK）
- `lib/interview/coach.fixture.ts` + `lib/interview/coach.test.ts` — fixture 與單元測試
- `app/api/interview/questions/route.ts` — 列出/建立題目（GET/POST）
- `app/api/interview/questions/[id]/route.ts` — 改題目文字 / 刪除（PATCH/DELETE）
- `app/api/interview/questions/[id]/versions/route.ts` — 版本 CRUD（POST 新增版本、PATCH 改答案）
- `app/api/interview/coach/route.ts` — 評估一個答案（POST）
- `app/api/interview/draft/route.ts` — 用履歷生初稿（POST）
- `app/interview/page.tsx` + `app/interview/_components/*` — 頁面與元件（清單、教練彈框、新增題目彈框）
- `app/_components/Sidebar.tsx` — 新增「面試準備」導覽項

---

## Task 1：資料模型（擴充 QuestionBank + 新增 AnswerVersion）

**Files:**
- Modify: `prisma/schema.prisma`（`model QuestionBank` 區塊 + `model User` 的 relations）
- Create（自動）: `prisma/migrations/<timestamp>_interview_coach/migration.sql`

**Interfaces — Produces:**
- `QuestionBank` 新欄位：`isCore Boolean`、`coreKey String?`、`category String`(既有)、`frequency Int`(既有)、`lastAskedCompanies Json`。
- 新 `AnswerVersion { id, questionBankId, label, content, score Int?, grade String?, lastCoaching Json?, updatedAt }`，`QuestionBank 1—* AnswerVersion`。

- [ ] **Step 1:** 編輯 `prisma/schema.prisma`，把 `model QuestionBank` 改成：

```prisma
model QuestionBank {
  id                  String   @id @default(cuid())
  userId              String
  question            String
  category            String   @default("other")
  sourceApplicationId String?
  userPerformance     String?
  frequency           Int      @default(1)
  isCore              Boolean  @default(false)
  coreKey             String?
  lastAskedCompanies  Json     @default("[]")
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  user     User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  versions AnswerVersion[]

  @@unique([userId, coreKey])
}

model AnswerVersion {
  id             String   @id @default(cuid())
  questionBankId String
  label          String   @default("我的版本")
  content        String   @db.Text @default("")
  score          Int?
  grade          String?      // needs_improvement | ok | good
  lastCoaching   Json?
  updatedAt      DateTime @updatedAt
  createdAt      DateTime @default(now())

  question QuestionBank @relation(fields: [questionBankId], references: [id], onDelete: Cascade)
}
```

> 註：原 `QuestionBank.answer String?` 移除，答案改存在 `AnswerVersion.content`（更新既有讀寫處見 Task 4/7）。若不想動既有復盤寫入，可暫時保留 `answer` 欄位並標 deprecated——實作時先 grep `questionBank` 用到 `answer` 的地方再決定。

- [ ] **Step 2:** 跑 migration（dev DB）：

Run: `pnpm prisma migrate dev --name interview_coach`
Expected: 新 migration 建立、`prisma generate` 成功、無錯誤。

- [ ] **Step 3:** typecheck：

Run: `pnpm typecheck`
Expected: PASS（若既有程式碼引用了被移除的 `answer`，這裡會報錯 → 一併修正或保留欄位）。

- [ ] **Step 4:** commit

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: 題庫資料模型加版本 — QuestionBank 擴充 + AnswerVersion（支援一題多版本/評分）"
```

---

## Task 2：核心題 seed（純資料，無 LLM）

**Files:**
- Create: `lib/interview/core-questions.ts`
- Test: `lib/interview/core-questions.test.ts`

**Interfaces — Produces:**
- `export interface CoreQuestion { coreKey: string; question: string; category: "behavioral"|"motivation"|"situational"|"technical"; hint: string; defaultVersions: string[] }`
- `export const CORE_QUESTIONS: CoreQuestion[]`

- [ ] **Step 1: 寫失敗測試** `lib/interview/core-questions.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { CORE_QUESTIONS } from "./core-questions";

describe("CORE_QUESTIONS", () => {
  it("每題都有唯一 coreKey 與必要欄位", () => {
    expect(CORE_QUESTIONS.length).toBeGreaterThanOrEqual(6);
    const keys = CORE_QUESTIONS.map(q => q.coreKey);
    expect(new Set(keys).size).toBe(keys.length); // 唯一
    for (const q of CORE_QUESTIONS) {
      expect(q.coreKey).toMatch(/^[a-z_]+$/);
      expect(q.question.length).toBeGreaterThan(4);
      expect(q.hint.length).toBeGreaterThan(4);
    }
  });
  it("自我介紹預設兩個版本（30秒/1分鐘）", () => {
    const intro = CORE_QUESTIONS.find(q => q.coreKey === "self_intro");
    expect(intro?.defaultVersions).toEqual(["30秒", "1分鐘"]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗** Run: `pnpm vitest run lib/interview/core-questions.test.ts` → FAIL（找不到模組）

- [ ] **Step 3: 實作** `lib/interview/core-questions.ts`

```ts
export interface CoreQuestion {
  coreKey: string;
  question: string;
  category: "behavioral" | "motivation" | "situational" | "technical";
  hint: string;
  defaultVersions: string[];
}

export const CORE_QUESTIONS: CoreQuestion[] = [
  { coreKey: "self_intro", question: "請做一個簡短的自我介紹。", category: "behavioral",
    hint: "一句定位 ＋ 一個最有力的成果（最好有數字）＋ 一句為什麼想來。打中重點，不貪多。",
    defaultVersions: ["30秒", "1分鐘"] },
  { coreKey: "biggest_setback", question: "你遇過最大的挫折是什麼？你如何面對？", category: "behavioral",
    hint: "用 STAR；挫折要真實，重點放在你怎麼面對與學到什麼，要有具體結果。", defaultVersions: ["我的版本"] },
  { coreKey: "problem_solving", question: "分享一次你解決問題的經驗。", category: "behavioral",
    hint: "情境→任務→行動→結果，行動要具體、結果要量化。", defaultVersions: ["我的版本"] },
  { coreKey: "team_difficulty", question: "在團隊合作中，你遇過最大的困難是什麼？", category: "behavioral",
    hint: "聚焦你的角色與具體作法，避免抱怨他人。", defaultVersions: ["我的版本"] },
  { coreKey: "why_us", question: "為什麼想加入我們？", category: "motivation",
    hint: "連結你的目標與這家公司具體的產品/做法，不要泛泛而談。", defaultVersions: ["我的版本"] },
  { coreKey: "strength_weakness", question: "你最大的優點和缺點是什麼？", category: "behavioral",
    hint: "優點佐證一個例子；缺點要真實＋你正在怎麼改善。", defaultVersions: ["我的版本"] },
];
```

- [ ] **Step 4: 跑測試確認通過** Run: `pnpm vitest run lib/interview/core-questions.test.ts` → PASS
- [ ] **Step 5: commit**

```bash
git add lib/interview/core-questions.ts lib/interview/core-questions.test.ts
git commit -m "feat: 核心題策展清單（seed）+ 結構測試"
```

---

## Task 3：答案教練引擎（Anthropic SDK + fixture 測試）

**Files:**
- Modify: `package.json`（新增 `@anthropic-ai/sdk`）、`.env.example`（`ANTHROPIC_API_KEY`）
- Create: `lib/interview/coach.ts`、`lib/interview/coach.fixture.ts`、`lib/interview/coach.test.ts`

**Interfaces — Produces:**
- `export interface CoachResult { grade:"needs_improvement"|"ok"|"good"; summary:string; strengths:string[]; improvements:{issue:string;suggestion:string;example:string}[]; structure:{label:string;ok:boolean}[] }`
- `export async function coachAnswer(input:{question:string;answer:string;category:string;resumeContext?:string}): Promise<CoachResult>`
- `export async function draftAnswer(input:{question:string;hint:string;resumeContext?:string}): Promise<string>`
- `export function parseCoachJson(raw:string): CoachResult`（純函式，供測試）

- [ ] **Step 1:** 安裝 SDK：`pnpm add @anthropic-ai/sdk`，並在 `.env.example` 加一行 `ANTHROPIC_API_KEY=`。
  > 若暫時沒有 Anthropic key：可先讓 `coachAnswer` 走 Groq（`groq-sdk`, model `llama-3.3-70b-versatile`），介面不變，之後換模型只改 `coach.ts` 內部。建議正式用 Claude（Haiku/Sonnet），見 spec 16.6。

- [ ] **Step 2: 寫失敗測試**（用 fixture，不打真 API）`lib/interview/coach.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { parseCoachJson } from "./coach";
import { GOOD_FIXTURE, VAGUE_FIXTURE } from "./coach.fixture";

describe("parseCoachJson", () => {
  it("好答案 → grade good 且 improvements 可空", () => {
    const r = parseCoachJson(GOOD_FIXTURE);
    expect(r.grade).toBe("good");
    expect(Array.isArray(r.strengths)).toBe(true);
  });
  it("空泛答案 → grade needs_improvement 且 improvements 非空、每點有 example", () => {
    const r = parseCoachJson(VAGUE_FIXTURE);
    expect(r.grade).toBe("needs_improvement");
    expect(r.improvements.length).toBeGreaterThan(0);
    for (const i of r.improvements) expect(i.example.length).toBeGreaterThan(0);
  });
  it("壞 JSON → 丟出可辨識錯誤（呼叫端會 fallback）", () => {
    expect(() => parseCoachJson("not json")).toThrow();
  });
});
```

- [ ] **Step 3:** 建 `lib/interview/coach.fixture.ts`（兩段合法 JSON 字串 `GOOD_FIXTURE`、`VAGUE_FIXTURE`，符合 `CoachResult` schema；VAGUE 的 improvements 每項含 `example`）。

- [ ] **Step 4: 跑測試確認失敗** Run: `pnpm vitest run lib/interview/coach.test.ts` → FAIL

- [ ] **Step 5: 實作 `lib/interview/coach.ts`**：用 `zod` 定義 `CoachResultSchema`；`parseCoachJson` 去除 ```​json fence → `JSON.parse` → `CoachResultSchema.parse`；`coachAnswer`/`draftAnswer` 呼叫 Anthropic（system prompt 嚴格要求：評等三級、improvements 每點「指名哪一句＋缺什麼＋一句可貼上的示範」、行為題檢查 STAR、繁中、低 temperature、只輸出 JSON），失敗 retry 一次再 fallback（回 `grade:"ok"` + summary 提示重試）。鏡像既有 `lib/review/analyze.ts` 的 try/catch/fence 清理寫法。

- [ ] **Step 6: 跑測試確認通過** Run: `pnpm vitest run lib/interview/coach.test.ts` → PASS
- [ ] **Step 7: commit**

```bash
git add package.json pnpm-lock.yaml .env.example lib/interview/coach.ts lib/interview/coach.fixture.ts lib/interview/coach.test.ts
git commit -m "feat: 答案教練引擎（Anthropic）+ JSON 解析 zod 驗證 + fixture 測試

教練品質是差異化核心，故用較強模型；解析與 fallback 鏡像 review/analyze。"
```

---

## Task 4：題目/版本 API（CRUD）

**Files:**
- Create: `app/api/interview/questions/route.ts`（GET 列出該 user 題庫含 versions；POST 新增自訂題）
- Create: `app/api/interview/questions/[id]/route.ts`（PATCH 改題目文字；DELETE 刪題）
- Create: `app/api/interview/questions/[id]/versions/route.ts`（POST 新增版本；PATCH 改某版本 content/label）
- Test: `app/api/interview/questions/questions.integration.test.ts`

**先讀後寫：** 開工前讀 `app/api/applications/[id]/route.ts` 與 `auth.ts`，鏡像其 `auth()` 驗證、`params: Promise<{id}>`、`NextResponse.json` 與錯誤碼寫法（AGENTS.md 要求）。

**Interfaces — Consumes:** Task 1 的 prisma models、`@/auth` 的 `auth()`、`@/lib/db/client` 的 `prisma`。
**Produces:** REST 介面給 Task 6 前端用（全部需登入；以 `session.user.id` 隔離；zod 驗證 body）。

- [ ] **Step 1:** 寫 integration test：未登入 GET → 401；登入後 POST 一題 → GET 撈得到；PATCH 改題目文字成功；新增版本後該題 versions 長度 +1；DELETE 後撈不到。（鏡像既有 integration test 設定 `vitest --project integration`；若無範本，先建最小 harness。）
- [ ] **Step 2:** 跑測試確認失敗。
- [ ] **Step 3:** 實作三支 route：GET/POST/PATCH/DELETE，每支 `auth()` 檢查 + zod 驗證 + 擁有權檢查（`where:{ id, userId }`）+ 非空 catch。
- [ ] **Step 4:** 跑測試確認通過 + `pnpm typecheck`。
- [ ] **Step 5:** commit `feat: 面試題庫 CRUD API（題目/版本，含擁有權與 zod 驗證 + integration test）`

---

## Task 5：教練 / 初稿 API

**Files:**
- Create: `app/api/interview/coach/route.ts`（POST `{question,answer,category,versionId?}` → `CoachResult`，並把 score/grade/lastCoaching 寫回該 `AnswerVersion`）
- Create: `app/api/interview/draft/route.ts`（POST `{coreKey|question,hint}` → `{draft:string}`，讀該 user 履歷/經歷當 context）
- Test: `app/api/interview/coach/coach.integration.test.ts`（mock `lib/interview/coach` 的匯出，驗證 route 串接與寫回 DB；不打真 API）

**Consumes:** Task 3 `coachAnswer/draftAnswer`、Task 1 models、履歷來源（`prisma.resume` / `prisma.workExperience`，讀 `lib/resume` 既有結構）。

- [ ] **Step 1:** 寫 integration test（mock coachAnswer 回 fixture → 呼叫 route → 回傳正確 + 對應 version 的 grade 被更新）。
- [ ] **Step 2:** 跑測試確認失敗。
- [ ] **Step 3:** 實作兩支 route（auth + zod + 每日次數上限檢查的 TODO 掛鉤點；呼叫 lib；coach 結果寫回 version）。
- [ ] **Step 4:** 測試通過 + typecheck。
- [ ] **Step 5:** commit `feat: 教練評估 / 初稿 API（寫回版本評分；mock LLM 的 integration test）`

---

## Task 6：/interview 頁面與元件（UI）

**Files:**
- Create: `app/interview/page.tsx`（server component：auth、撈題庫、組初始資料）
- Create: `app/interview/_components/InterviewPage.tsx`（client：視角切換、清單、進度）
- Create: `app/interview/_components/CoachModal.tsx`（兩欄教練彈框）
- Create: `app/interview/_components/AddQuestionModal.tsx`（新增題目）

**先讀後寫：** 鏡像 `app/board/[applicationId]/_components/AiQuestionsEvolved.tsx`（client 元件 + fetch PATCH 寫法）與 `app/saved/_components/JobDetailModal.tsx`（彈框結構）。**版面、class、互動以 `docs/mockups/interview-prep.html` 為唯一依據**（已定稿）：核心題/常被問到雙視角、Notion 摺疊清單（已答展開唯讀＋編輯、未答→現在練）、兩欄教練彈框（評等三級＋做得好＋可更好附示範句＋結構檢查；編輯題目/刪除在彈框標題旁；版本切換/＋版本）、右上「＋新增題目」、暖色 token。

- [ ] **Step 1:** 建 `page.tsx`（server）撈資料、無資料時用 `CORE_QUESTIONS` 補齊核心題。
- [ ] **Step 2:** 建 `InterviewPage.tsx`：把 mockup 的 HTML 轉成 React，串 Task 4/5 API（展開唯讀、現在練/編輯開 CoachModal、新增題目開 AddQuestionModal）。
- [ ] **Step 3:** 建 `CoachModal.tsx`：左欄答案（版本 tabs、初稿、儲存→PATCH version、請教練評估→coach API→右欄回饋、重新評估）、標題旁刪除題目（DELETE）。
- [ ] **Step 4:** 建 `AddQuestionModal.tsx`：輸入題目＋題型 → POST 新增。
- [ ] **Step 5:** 手動驗證（dev server）：`pnpm dev` → 開 `/interview` → 練一題、評估、存、加題、刪題、切視角；用 preview 工具截圖佐證。
- [ ] **Step 6:** commit `feat: /interview 頁（核心題/常被問到 + 教練彈框 + 新增題目），UI 依定稿 mockup`

---

## Task 7：導覽 + 常被問到資料流

**Files:**
- Modify: `app/_components/Sidebar.tsx`（在「求職追蹤」後加「面試準備」項，`/interview`，沿用既有 SVG icon 樣式）
- Modify: 復盤流程（`app/board/[applicationId]/_components/ReviewTab.tsx` 或 `AiQuestionsEvolved.tsx` 既有「面試有問到」勾選）→ 確保勾選會 upsert 到 `QuestionBank.frequency`＋`lastAskedCompanies`（多數既有，補齊缺口）
- Modify: `app/interview/_components/InterviewPage.tsx`（「常被問到」視角：依 `frequency` 排序顯示、未答給「現在練」）

- [ ] **Step 1:** Sidebar 加項；`pnpm dev` 確認導覽可達。
- [ ] **Step 2:** 追蹤「面試有問到」→ `QuestionBank` 累積的寫入點，補上 `frequency`/`lastAskedCompanies`（grep 既有寫入）。
- [ ] **Step 3:** 「常被問到」視角接真資料（query frequency desc）。
- [ ] **Step 4:** typecheck + 手動驗證。
- [ ] **Step 5:** commit `feat: 面試準備導覽 + 常被問到（個人考古題）資料流`

---

## Self-Review（對照 spec）
- 核心題練習＋答案教練（spec 5/8）→ Task 2/3/5/6 ✓
- 一題多版本（spec 16.4）→ Task 1/4/6 ✓
- 自訂題 + 編輯/刪除（spec 16.2/16.8）→ Task 4/6 ✓
- 常被問到考古題（spec 16.5）→ Task 7 ✓
- 模型分工（spec 16.6）→ Task 3（Anthropic）✓；104 維持 Groq（不動）
- IA/UI 定稿（spec 16）→ Task 6 依 mockup ✓
- 缺口：freemium「5 次上限」目前只在 Task 5 留掛鉤點，計費/上限的完整實作列為 Phase 2（spec 已將付費系統列 later）。
