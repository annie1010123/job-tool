# JobPilot — AI 求職教練

@AGENTS.md

個人作品集專案（1 人開發，自用 + 給面試官看）。UI 一律**繁體中文**，暖色調（頁面底 `#f5f3ee`、主色 `#1a1a18`、強調綠 `#0f6e56` on `#E1F5EE`），**禁用藍色 #2563eb**，桌面 Web 為主。

last-updated: 2026-07-03（舊版備份：`CLAUDE.md.bak-20260703`）

## 技術棧（以此為準，舊文件寫 OpenAI 的已過時）

Next.js 16 App Router + TypeScript / Prisma + PostgreSQL (Supabase) + pgvector / **LLM = Groq**（llama-3.3-70b-versatile 解析、llama-3.1-8b-instant 輕量結構化）/ NextAuth magic link / Vercel 部署 / pnpm。
PDF 解析：`pdfjs-dist` + `next.config.ts` 的 `serverExternalPackages: ["pdfjs-dist","pdf-parse"]`（Turbopack 相容性，別移除）。
注意：`openai` 套件仍在用——僅供錄音轉錄（Whisper，`lib/review/transcribe.ts`），不要誤刪；文字 LLM 一律 Groq。

## 開發規範

- 禁止 `any`；未知用 `unknown` + type guard；API response 用 zod 驗證
- 系統邊界（API / DB / LLM call）一律處理錯誤，禁止空 catch；LLM 失敗 retry 一次再 fallback
- 所有 DB 查詢帶 `userId` 過濾（資料隔離靠 Prisma 層，不是 RLS）
- git：新功能開新分支、main 保持乾淨、**操作前先說明經同意**；commit 格式 `type: description`，描述寫為什麼
- **改完前端必須實際打開頁面驗證再回報**（typecheck/build 不算驗證）
- 部署：`vercel deploy --prod`（在專案根目錄執行；push 到 GitHub 不會自動部署）

## 找檔案

改功能前先查 `docs/FILE-MAP.md`（功能 → 檔案對照）。找不到再 grep。

## 需要時才讀

- 產品決策 / 功能規劃 / Not Doing List / 決策記錄 → `docs/PRODUCT-CONTEXT.md`
- 全域工作守則與派工規則 → `~/.claude/CLAUDE.md` 及 `~/.claude/playbook/`
