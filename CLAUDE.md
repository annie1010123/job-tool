# JobPilot — AI 求職教練

@AGENTS.md

> 你的 AI 求職教練，每一次面試都讓你更強。
> **個人作品集 + 自用 / 1 人 / 2 個月 / 目標讀者 = 工程主管**

last-updated: 2026-06-09

---

## 產品上下文

**一句話描述**：JobPilot — 你的 AI 求職教練，每一次面試都讓你更強
**目標用戶**：正在找實習/工作的學生和初階工程師（同時投 5+ 間）
**核心 JTBD**：當積極求職的學生每天要在多個平台切換找職缺、改履歷、準備面試時，想要一個記得所有資料、會從面試中學習的 AI 助手，以便把時間省下來花在真正重要的面試準備上
**Aha Moment**：用戶第一次看到 AI 面試準備頁面中出現「根據你上次面試經驗延伸」的標注題目
**北極星指標**：每週 AI 面試準備使用次數

## 技術棧

| 類別 | 選型 |
|------|------|
| Framework | Next.js (App Router) + TypeScript |
| DB | PostgreSQL (Supabase) + pgvector |
| ORM | Prisma |
| LLM | OpenAI (GPT-4o-mini 結構化, text-embedding-3-small embedding) |
| 語音轉文字 | OpenAI Whisper API |
| Email | Resend + React Email |
| Auth | NextAuth (email magic link) |
| Storage | Supabase Storage (RLS + signed URL) |
| Crawler | Playwright |
| Cron Worker | Railway |
| Deploy | Vercel |
| 套件管理 | pnpm |

## 開發規範

### TypeScript
- **禁止 `any`**，未知用 `unknown` + type guard
- API response 用 `zod` 定義 schema 並嚴格驗證
- 優先 discriminated union，避免 optional field 亂竄

### Error Handling
- 系統邊界（API / DB / LLM call / crawler）一律處理錯誤
- 禁止空 catch
- LLM call 失敗預設 retry 一次，再失敗 fallback

### Git
- commit 格式 `type: description`（feat/fix/refactor/chore/docs/test）
- commit 描述寫「**為什麼**」
- 每完成一個 ticket 即 commit

### Testing
- 每個新功能至少 1 個 integration test
- LLM 相關用 fixture（recorded response）測試

---

## MVP 範圍（P0）

### 已完成（保留不動）
- F1 Magic Link 登入
- F2 Onboarding（履歷上傳 + 求職意圖設定 + LLM 擴展）
- F3 104 爬蟲 + Embedding Match + Daily Email 推薦 + Dashboard 推薦清單

### 新增功能（待開發）
- F0 Landing Page + 試玩（不需登入，貼 JD → AI 生成推薦信）
- F4 職缺收藏區（推薦一鍵收藏 + 手動貼 URL + 平台分類 + 公司類型標籤）
- F5 Kanban 強化（從收藏區一鍵投遞 → 自動移到已投遞）
- F6 推薦信 AI 生成（根據履歷+JD+公司資訊生成草稿，3 種語氣）
- F7 AI 面試準備進化（現有基礎 + 歷史題庫加權 + 改善建議）
- F8 面試錄音上傳 + AI 復盤（Whisper 轉文字 → AI 萃取 Q&A → 評估 + 建議）
- F9 面試題庫自動進化（F8 的 Q&A 自動歸類 → F7 出題時引用）
- F10 UI 優化（統一設計語言、響應式、作品集展示水準）
- F11 部署上架 + README

### 明確不做（Not Doing List）
- 自動投遞（法律風險）
- 面試中即時 AI 提示（道德問題）
- 薪資談判建議（資料不足）
- 社群功能（不同產品）
- 付費/訂閱系統（作品集不需要）
- 手機 App（Web RWD 即可）
- 多語系（目標用戶是台灣求職者）
- 多平台爬蟲（MVP 先 104 + 手動 URL）

---

## 核心流程

```
用戶登入 → Onboarding（履歷+意圖）
  → 職缺來源 A：每日 Email/Dashboard 推薦（爬蟲+embedding）
  → 職缺來源 B：手動貼 URL
  → 職缺收藏區（分平台、分類型）
  → 投遞 → AI 生成推薦信
  → Kanban「已投遞」
  → 面試通知 →「面試中」
  → AI 面試準備（JD + 歷史題庫）
  → 面試 → 上傳錄音 / 手動填寫 → AI 復盤
  → Q&A 回饋題庫 → AI 進化 🔄
```

---

## 關鍵決策記錄

| 決策 | 選擇 | 理由 | 日期 |
|------|------|------|------|
| 面試復盤方式 | 錄音上傳 + 手動 fallback | 錄音品質高但上傳率可能低，手動保底 | 2026-06-09 |
| 推薦信生成 | LLM 根據履歷+JD 生成 | RICE 最高，最大痛點 | 2026-06-09 |
| 職缺來源 | 爬蟲推薦 + 手動貼 URL 並存 | 保留爬蟲展示技術力，手動補齊多平台 | 2026-06-09 |
| 北極星指標 | 每週 AI 面試準備使用次數 | 反映核心差異化功能使用，非虛榮指標 | 2026-06-09 |

## 風險警示（來自 Pre-mortem）

- ⚠️ **錄音上傳率可能低**：面試完太累不想上傳 → 預防：推播提醒 + 手動快速問卷 fallback
- ⚠️ **Scope creep**：功能太多 2 個月做不完 → 預防：嚴格遵守 Not Doing List，每週範圍檢查
- ⚠️ **104 爬蟲被擋**：反爬蟲升級 → 預防：已有 parse-jd API 可解析單一 URL
- ⚠️ **LLM 成本**：GPT-4o-mini + Whisper API，設每日上限

## 安全性備註

- 認證：NextAuth email magic link + session（database strategy）
- 資料隔離：Supabase RLS，每個用戶只能存取自己的資料
- 錄音檔案：Supabase Storage + signed URL，不公開
- API 保護：所有敏感 API 需 auth，rate limiting per user
- CORS：只允許自己的 domain
- 隱私：明確告知用戶只能上傳自己有權錄音的面試

## 開發流程

請依照 `TASKS.md` 的 Phase 順序逐步執行。每完成一個 Phase：
1. 確認所有 Task 的驗收標準都通過
2. 詢問使用者是否要進入下一個 Phase
3. 如果遇到架構問題，參考既有程式碼結構

## 相關文件

- **`docs/FILE-MAP.md` — 功能 → 檔案對照地圖（改功能前先查這個，最快找到要開的檔）**
- `docs/JobPilot-PRD-v4.0.html` — 最新 PRD（流程圖、ERD、API、Wireframe）
- `TASKS.md` — 開發任務清單（Phase 分期 + 驗收標準）
- `TICKETS.md` — 逐 ticket 明細
- `docs/JobPilot-Product-Spec-v1.0.pdf` — 早期完整產品規格（作品集設計演進用）
