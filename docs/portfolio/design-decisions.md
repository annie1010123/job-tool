# JobPilot — 設計決策紀錄

> 每個設計決策的選項、最終選擇、和為什麼。面試時可以直接用。

## UI / UX 決策

| # | 決策 | 選項 | 最終選擇 | 為什麼 |
|---|------|------|---------|--------|
| 1 | 推薦和收藏要分頁還是合併？ | A) 分兩頁 B) 上下排列 C) Tab 切換 | **C) Tab 切換** | 推薦的唯一動作是收藏，分開增加跳轉；上下排列推薦多時收藏被推太下面 |
| 2 | 意圖編輯要跳頁還是 Modal？ | A) 跳 /onboarding/intent B) Modal | **B) Modal** | 編輯完用戶要回原頁面，跳頁中斷感太強 |
| 3 | Dashboard 核心是什麼？ | A) 推薦列表 B) 全局總覽 | **B) 全局總覽** | 沒推薦時整頁空白，Dashboard 應該永遠有東西看 |
| 4 | 推薦卡片的 CTA？ | A) 收藏+投遞+詳情 B) 只留收藏 | **B) 只留收藏** | 一個頁面一個核心動作，投遞是下一步的事 |
| 5 | 背景色？ | A) Tailwind zinc-50 B) 自訂 #f1efe8 | **B) #f1efe8** | 暖色調更柔和，跟冷灰系 SaaS 差異化 |
| 6 | 導覽方式？ | A) 頂部 navbar B) 側邊 sidebar | **B) Sidebar** | 頁面多了之後頂部放不下，sidebar 更有層級感 |
| 7 | 收藏區頁面名稱？ | A) 收藏區 B) 職缺總覽 C) 找工作 D) 探索 | **C) 找工作** | 包含推薦+收藏，「找工作」最直覺 |
| 8 | 新增職缺時 URL 必填嗎？ | A) 必填 B) 選填 | **B) 選填** | 手動新增的職缺可能沒有 URL（朋友推薦、招募會等） |
| 9 | Application 詳情頁的 tab 順序？ | A) 基本→準備→推薦信→復盤 B) 準備→推薦信→復盤→基本 | **B) 準備優先** | 用戶進詳情頁最常見的動作是準備面試，不是看基本資料 |

## 技術決策

| # | 決策 | 選項 | 最終選擇 | 為什麼 |
|---|------|------|---------|--------|
| 1 | 爬蟲引擎 | A) Playwright B) Python curl_cffi | **B) curl_cffi** | Cloudflare TLS fingerprint 偵測擋了 Playwright，curl_cffi 可偽裝 Chrome |
| 2 | Auth session 策略 | A) Database B) JWT | **B) JWT** | Database 每次 auth() 查 DB（200ms），JWT 從 cookie 解碼，零 DB 查詢 |
| 3 | LLM 供應商 | A) OpenAI GPT-4o-mini B) Groq llama-3.3-70b | **B) Groq** | 免費額度高、速度快（Groq 推論晶片）、llama 品質足夠 |
| 4 | 語音轉文字 | A) Groq Whisper B) OpenAI Whisper | **B) OpenAI** | 品質更穩定，$0.006/min 可接受 |
| 5 | Schema 變更方式 | A) prisma migrate dev B) prisma db push | **B) db push** | pgvector 不支援 shadow DB，migrate dev 會報錯 |
| 6 | 面試復盤方式 | A) 只有錄音 B) 只有手動 C) 兩者都支援 | **C) 兩者** | 錄音品質高但上傳率可能低，手動保底 |
| 7 | 頁面導覽元件 | A) `<a href>` B) Next.js `<Link>` | **B) `<Link>`** | `<a>` 整頁 reload（3-5秒），`<Link>` client-side routing（瞬間） |
| 8 | 推薦信如何使用工作經歷 | A) 用整份履歷 B) 挑最相關 2-3 段 | **B) 挑最相關** | 避免推薦信太長太雜，STAR 法則聚焦在匹配的經歷 |

## 產品決策

| # | 決策 | 選項 | 最終選擇 | 為什麼 |
|---|------|------|---------|--------|
| 1 | 職缺來源策略 | A) 只有爬蟲推薦 B) 只有手動 C) 兩者並存 | **C) 並存** | 爬蟲展示技術力，手動補齊多平台需求 |
| 2 | Landing Page 要不要 auth？ | A) 需登入 B) 不需登入 | **B) 不需登入** | Reviewer 不會為了看 Demo 去收信登入 |
| 3 | 北極星指標 | A) DAU B) 投遞數 C) AI 面試準備使用次數 | **C) AI 準備次數** | DAU 是虛榮指標，投遞數無法歸因，AI 準備反映核心差異化 |
| 4 | MVP 先做哪個 AI 功能？ | A) 推薦信生成 B) AI 面試進化 | **A) 推薦信** | RICE 最高：每個受訪者都提到、技術可行性高 |
| 5 | 開發方法論 | A) 直接寫 code B) 先 mockup 再 code | **B) Mockup 先行** | v1 經驗：直接寫導致整頁重寫 3 次。先確認方向再寫。 |
