# JobPilot 產品上下文（從 CLAUDE.md 抽出，2026-07-03）

> 這是產品規劃層的背景資料。日常寫程式不需要讀；做產品決策、寫作品集文件、規劃新功能時才讀。

## 產品定位

**一句話**：JobPilot — 你的 AI 求職教練，每一次面試都讓你更強
**性質**：個人作品集 + 自用 / 1 人開發 / 目標讀者 = 工程主管與 PM 面試官
**目標用戶**：正在找實習/工作的學生和初階工程師（同時投 5+ 間）
**核心 JTBD**：當積極求職的學生每天要在多個平台切換找職缺、改履歷、準備面試時，想要一個記得所有資料、會從面試中學習的 AI 助手，以便把時間省下來花在真正重要的面試準備上
**Aha Moment**：AI 面試準備頁出現「根據你上次面試經驗延伸」的標注題目
**北極星指標**：每週 AI 面試準備使用次數

## MVP 功能狀態（2026-07-03）

已完成：Magic Link 登入、Onboarding、104 爬蟲 + Embedding 推薦 + Daily Email、Landing 試玩、職缺收藏、Kanban 投遞追蹤、推薦信 AI 生成、AI 面試題庫、面試錄音覆盤、個人資料頁（時間軸經歷庫 + PDF 匯入）、Vercel 部署。

## 明確不做（Not Doing List）

自動投遞（法律風險）、面試中即時 AI 提示（道德）、薪資談判建議、社群功能、付費系統、手機 App、多語系、多平台爬蟲。

## 關鍵決策記錄

| 決策 | 選擇 | 理由 | 日期 |
|------|------|------|------|
| 面試復盤方式 | 錄音上傳 + 手動 fallback | 錄音品質高但上傳率可能低 | 2026-06-09 |
| 推薦信生成 | LLM 根據履歷+JD 生成 | RICE 最高，最大痛點 | 2026-06-09 |
| 職缺來源 | 爬蟲推薦 + 手動貼 URL 並存 | 爬蟲展示技術力，手動補多平台 | 2026-06-09 |
| 北極星指標 | 每週 AI 面試準備使用次數 | 非虛榮指標 | 2026-06-09 |
| LLM 供應商 | Groq（llama-3.3-70b / llama-3.1-8b） | 免費額度、速度快，取代原規劃的 OpenAI | 2026-06 |
| PDF 解析 | pdfjs-dist + serverExternalPackages | Turbopack 會弄壞 worker 解析 | 2026-07-03 |

## 風險警示（Pre-mortem）

- 錄音上傳率可能低 → 手動快速問卷 fallback
- Scope creep → 嚴守 Not Doing List
- 104 反爬蟲升級 → parse-jd API 可解析單一 URL 保底
- LLM 成本 → Groq 免費層有 rate limit，注意批次呼叫

## 安全性備註

- NextAuth email magic link + database session
- 資料隔離：查詢一律帶 `userId`（Prisma 層過濾）
- 錄音檔：Supabase Storage + signed URL
- 敏感 API 需 auth；CORS 只允許自己 domain

## 相關文件

- `docs/FILE-MAP.md` — 功能 → 檔案對照地圖
- `docs/JobPilot-PRD-v4.0.html` — PRD
- `TASKS.md` / `TICKETS.md` — 任務清單
