# JobPilot 開發復盤 — 整合版（2026-06-10 ～ 2026-06-11）

---

## 專案背景

- **定位**：個人作品集 + 自用，目標讀者為工程主管
- **核心功能**：AI 語意職缺推薦、推薦信生成、面試 AI 復盤、全流程追蹤
- **技術棧**：Next.js App Router + TypeScript、Supabase PostgreSQL + pgvector、Prisma、NextAuth v5、Railway（爬蟲 cron）、Vercel（前端）

---

## 一、爬蟲系統（最核心瓶頸）

### 1-1 問題根源（06-10 發現）

透過 `debug-search.ts` 確認：爬蟲自 **2026-05-28** 起完全失效。

**原因**：104 啟用 Cloudflare Bot Management，對 headless Chromium 進行 TLS fingerprint 偵測。Playwright 的 JA3/JA4 指紋跟真實瀏覽器差異太大，搜尋頁直接回傳 307 → 403，`waitForResponse` 永遠 timeout，circuit breaker 在第五個關鍵字就觸發。

### 1-2 解法：換掉爬蟲引擎

放棄 Playwright，改用 **Python + curl_cffi**。

curl_cffi 底層用 libcurl，可以完整偽裝 Chrome 的 TLS 指紋（JA3/JA4 + ALPN + cipher suites），對 Cloudflare 來說跟真實 Chrome 無法區分。

| 反爬機制 | 實作方式 |
|---|---|
| TLS 指紋偽裝 | `curl_cffi.Session(impersonate="chrome124")` |
| UA 池 + session 粘性 | 開頭隨機選 UA，整個 session 固定 |
| 動態 Referer | 搜尋 API 用搜尋頁 URL，detail API 用職缺頁 URL |
| 隨機延遲 | 0.5–1.5s + 5% 機率多等 3–10s |
| 小時配額 | 自維護 timestamps list，超過 1500 筆就等 |
| 429 指數退避 | 30 × 2^n 秒，最久 240s |
| Circuit breaker | 連續 5 次錯誤直接停 |
| 兩段式流程 | 先打 list API 拿 jobNo，再打 detail API |
| 翻頁早停 | order=12 降序，整頁 appearDate 早於 cutoff 就停 |

**驗收**：首次執行 9 筆新職缺，失敗 0 筆，全部有 description。

### 1-3 Railway 部署 Crash（06-11 發現）

**症狀**：Railway 服務 `● Crashed`，log 顯示 `psycopg2.OperationalError: Network is unreachable`

**根因**：`DIRECT_URL` 設的是 Supabase 直連 hostname（`db.xxx.supabase.co`），Railway SFO region 將其解析為 **IPv6 位址**，而 Railway 容器不支援 IPv6。

**修法**：Railway 環境變數 `DIRECT_URL` 換成 Supabase **pooler hostname**（IPv4）：
```
舊：postgresql://postgres:...@db.oilzqorglwmrysahrgnf.supabase.co:5432/postgres
新：postgresql://postgres.oilzqorglwmrysahrgnf:...@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
```

修復後狀態：`● Online`。

### 1-4 爬蟲與推薦系統的關係

爬蟲只負責存 JD + embedding，**不跑 matching**。推薦出現在網站需要兩步：

```
Step 1：Railway cron 13:00 UTC（台灣 21:00）→ 爬蟲存新 JD + embedding
Step 2：Vercel cron 13:30 UTC（台灣 21:30）→ /api/cron/daily 跑 matching → Recommendation 記錄寫入 → 寄 email
```

**手動觸發流程（本機測試用）**：
```bash
# Step 1：爬職缺
cd worker/crawler
DIRECT_URL="postgresql://..." python3 run.py

# Step 2：跑 matching（dev server 需跑著）
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily
```

### 1-5 推薦系統已知問題

| 問題 | 說明 | 優先度 |
|---|---|---|
| 新 JD 沒有 embedding | `embed_jd()` 需要 Gemini API Key，Railway 沒設定 → embedding 永遠空 → INNER JOIN 過濾掉 | 高 |
| 503 筆舊 JD 沒有 description | 舊爬蟲從未打 detail API，只存基本資料 | 中 |
| 關鍵字是靜態的 | onboarding 設定後不會根據行為自動更新 | 低 |

---

## 二、UI 調整

### 2-1 收藏區改版（06-10）
- 來源篩選器改成 104 / Cake / LinkedIn / Yourator / 手動新增
- 卡片整體可點擊（onClick 跳 `/board/:id`）
- 按鈕改名「投遞準備」

### 2-2 背景色統一（06-10）
`/board` 和 `/board/[id]` 從 `bg-zinc-50` 改成 `style={{ background: "#f1efe8" }}`

### 2-3 左側 Sidebar + AppShell（06-11）

新增全局導覽 sidebar，所有已登入頁面共用：
- 主頁 / 收藏區 / 求職追蹤 / 個人資料
- 底部：求職意圖設定
- 寬度 220px，sticky，`#ebe9e2` 背景

建立 `AppShell` wrapper component，四個主頁面全部套用。

### 2-4 Layout 問題（06-11 用戶截圖反饋，尚未修）

| 問題 | 原因 |
|---|---|
| 內容偏窄且兩側留白多 | `max-w-2xl` + `margin: auto` 在有 sidebar 的佈局下造成不對稱空白 |
| 空狀態太薄弱 | 只有一行文字，沒有引導 CTA |
| Dashboard 數字 bar 孤立 | 5 格全 0 對新用戶沒有意義 |

**待改**：內容改靠左對齊、`max-w-2xl` 改 `max-w-3xl`、empty state 加引導按鈕。

---

## 三、導覽速度優化（06-11）

### 問題根源

用戶反映每按一個按鈕等 3–5 秒。逐層診斷：

1. **誤解**：以為是 Turbopack dev 模式每次重新編譯 → 其實 Turbopack 第一次後就快取
2. **根因 A**：`<a href>` 造成整頁 reload，而不是 Next.js client-side routing
3. **根因 B**：NextAuth `strategy: "database"` 導致每次 `auth()` 去 Supabase 查一次（~200ms），加 DB 查詢共 2-3 秒

### 三層修法

**修一：`<a>` → `<Link>`**
修改位置：`TrackButton.tsx`、`RecommendationList.tsx`、`SavedJobList.tsx`（投遞準備按鈕）、`board/[applicationId]/page.tsx`

**修二：JWT session 策略**（消除每次 auth DB 查詢）
```typescript
// auth.ts
session: { strategy: "jwt" }
callbacks: {
  jwt({ token, user }) { if (user) token.id = user.id; return token; },
  session({ session, token }) { session.user.id = token.id as string; return session; }
}
```
注意：切換後舊的 database session 全部失效，用戶需重新登入一次。

**修三：`loading.tsx` 骨架畫面**（改善體感）

5 個路由加入即時骨架畫面：`dashboard`、`saved`、`board`、`board/[applicationId]`、`profile`

---

## 四、新功能

### 4-1 工作經歷管理 + 推薦信 STAR 法則（06-11）

新增 `WorkExperience` model，讓用戶輸入多段工作經歷，推薦信 AI 根據 JD 自動挑選最相關的 2-3 段生成 400-600 字推薦信。

**新增檔案**：
- `prisma/schema.prisma`：WorkExperience model
- `app/api/profile/experiences/route.ts`：GET + POST
- `app/api/profile/experiences/[id]/route.ts`：PATCH + DELETE
- `app/profile/_components/ExperienceList/Card/Form.tsx`：前端 CRUD
- `lib/cover-letter/generate.ts`：STAR prompt 重寫

**注意**：schema 變更用 `prisma db push`（不用 `migrate dev`，因為 pgvector shadow DB 問題）。

### 4-2 面試準備加題目修復（06-11）

`window.prompt()` 在生產環境被瀏覽器靜默阻擋，改用 inline textarea + 類型選擇器。

### 4-3 Landing Page Mockup（06-11，尚未實作）

參考 jobbojobs.com 設計，mockup 存於 `mockup-landing.html`，本機預覽：`http://localhost:8899/mockup-landing.html`

設計包含：Navbar + Hero（左文右 mockup）+ 平台 logo 列 + 三欄功能 + CTA + Footer。

---

## 五、Vercel 正式部署（06-11）

### 部署踩坑

| 坑 | 原因 | 修法 |
|---|---|---|
| Build 失敗 | Vercel 全新 node_modules 沒有 Prisma client | `package.json` build 加 `prisma generate &&` |
| GitHub 自動部署失效 | GitHub App 未安裝到 repo | 改為手動 `vercel --prod --yes` |
| 手機連不上 | `NEXTAUTH_URL` 沒設，auth redirect 跑回 localhost | `vercel env add NEXTAUTH_URL production` |
| Google OAuth 失敗 | redirect URI 沒加 Vercel domain | Google Cloud Console 新增兩筆 URI |

### 正式網址
**https://job-tool-three.vercel.app**

### 環境變數（共 15 個）
`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`, `AUTH_TRUST_HOST`

---

## 六、JD 描述消失問題（06-10）

### 根因
舊爬蟲「搜尋→存基本資料」流程從未打 detail API，551 筆 JD 中 493 筆 description 為 null。

### 手動 patch
用 `patch-user-jds.ts` 對用戶已收藏職缺做 DOM scraping（`div.job-description`），成功補上 950 字描述。一筆（昇恆昌）遇到 Cloudflare challenge 失敗。大規模 backfill 留待後續用 Python 爬蟲處理。

---

## 技術債清單（截至 06-11）

| 優先 | 項目 | 說明 |
|---|---|---|
| 高 | Railway Gemini API Key | 沒設定 → 新爬 JD 沒 embedding → 永遠不進推薦池 |
| 高 | App 內容 layout 問題 | `max-w-2xl` 置中在 sidebar 佈局下太窄 |
| 中 | Landing page 實作 | mockup 確認後寫入 `app/page.tsx` |
| 中 | 493 筆舊 JD backfill description | Python 爬蟲可做，尚未排程 |
| 中 | 手機登入驗收 | NEXTAUTH_URL 補上後未完整測試 |
| 低 | GitHub Auto Deploy | GitHub App 未連，每次需手動部署 |
| 低 | 關鍵字靜態問題 | 不會根據行為自動更新 |

---

## 架構備忘

```
爬蟲:       python3 worker/crawler/run.py（讀 DIRECT_URL 環境變數）
DB 連線:    Supabase pooler port 5432（psycopg2）/ port 6543 pgbouncer（Prisma）
Matching:   GET /api/cron/daily（Authorization: Bearer CRON_SECRET）
Session:    NextAuth v5 JWT strategy，不查 DB，從 cookie 解碼
Schema 變更: prisma db push（不用 migrate dev，pgvector shadow DB 問題）
部署:       vercel --prod --yes（每次手動）
正式網址:   https://job-tool-three.vercel.app
推薦算法:   finalScore = 0.5×intentScore + 0.5×keywordScore × boost (recency/competition)
```
