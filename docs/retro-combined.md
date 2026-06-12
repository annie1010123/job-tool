# JobPilot 開發復盤 — 整合版（2026-06-10 ～ 2026-06-12）

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

### 2-4 Layout 問題（06-11 用戶截圖反饋 → 06-12 已修）

| 問題 | 原因 | 修法 |
|---|---|---|
| 內容偏窄且兩側留白多 | `max-w-2xl` + `margin: auto` 在有 sidebar 的佈局下造成不對稱空白 | 改 `max-w-760px`，內容更寬 |
| 空狀態太薄弱 | 只有一行文字，沒有引導 CTA | 加待處理事項 + 快速操作按鈕 |
| Dashboard 數字 bar 孤立 | 5 格全 0 對新用戶沒有意義 | 加問候語摘要 + 雙欄（待處理/動態） |

詳見 §2-5 ~ §2-9。

### 2-5 Dashboard 全面改版（06-12）

**核心洞察**：Dashboard 不應該只是「推薦頁」，應該是整個求職狀態的總覽。

原本 Dashboard 只有「今日推薦」一個區塊，沒推薦時整頁空白。改版後結構：

```
問候語（早安 👋 + 摘要）
├── 求職進度 Stats（5 格可點擊卡片，連到 /board）
├── 求職意圖列（顯示意圖 + 編輯連結）
├── 快速操作（新增職缺 + 貼 URL 收藏）
├── 雙欄區塊
│   ├── 待處理（未投遞的職缺、待面試準備、新推薦）
│   └── 最近動態（收藏/投遞/面試時間線）
└── 推薦摘要（前 3 筆 + 查看全部）
```

**瓶頸**：快速操作原本放「貼 JD 生成推薦信」，但每個職缺詳情頁已有此功能，連結目標不明確。
**解法**：改成「貼 URL 收藏職缺」，這是每天都會用到的動作。

**改動檔案**：
- `app/dashboard/page.tsx` — 重寫，新增待處理/動態/推薦摘要查詢
- `app/dashboard/_components/DashboardHome.tsx` — 新建元件

### 2-6 收藏區 → 「找工作」頁面（06-12）

**決策過程**：

1. 推薦職缺和收藏區是否合併？
   - 推薦的唯一動作就是「收藏」，放在同一頁減少跳轉
   - 先考慮上下分段 → 但推薦 20+ 筆時收藏被推太下面
   - **最終方案：tab 切換** `[AI 推薦 (10)] [我的收藏 (4)]`

2. 頁面要不要改名？
   - 「收藏區」不再準確（包含推薦 + 收藏）
   - 選項：職缺總覽 / 找工作 / 職缺庫 / 探索
   - **選擇「找工作」** — 簡單直覺

3. 推薦卡片的 CTA 應該是什麼？
   - 分析用戶流程：推薦 → 收藏 → 投遞 → 追蹤
   - 每一步的 CTA 只做這一步的事
   - **結論**：推薦卡片只留「收藏」，去掉「詳情」「投遞」（點卡片進詳情）

**改動檔案**：
- `app/_components/Sidebar.tsx` — 「收藏區」→「🔍 找工作」，移除底部求職意圖設定
- `app/saved/page.tsx` — 重寫，查詢推薦 + 收藏 + 意圖 + 地區
- `app/saved/_components/FindJobTabs.tsx` — 新建，AI 推薦 + 我的收藏 tab
- `app/saved/_components/SavedJobList.tsx` — 保留但不再直接使用

### 2-7 求職意圖編輯改 Modal（06-12）

**問題**：按「編輯」跳到 `/onboarding/intent` 整個新頁面，操作中斷感太強。
**解法**：改成 Modal 彈窗，在原頁面直接編輯，不跳頁。

**新增檔案**：`app/saved/_components/IntentEditModal.tsx`

### 2-8 意圖 Modal 加地區篩選（06-12）

**問題**：求職意圖只有文字描述和關鍵字，沒有地區等結構化篩選。
**發現**：DB 的 User model 已有 `locationFilter` 欄位（預設台北市、新北市），但前端沒入口、爬蟲也沒用到。

**解法**：
- Modal 加「地區（可多選）」checkbox 區塊（台北/新北/桃園/新竹/台中/台南/高雄/其他）
- API `/api/intent/expand` 新增接收 `locationFilter` 參數，存到 User model
- 爬蟲的地區過濾列為後續 TODO

### 2-9 Mockup 驅動開發流程（06-12 方法論）

這次改版採用 **先 mockup 再寫 code** 的流程，每個版面都經過：
1. 寫 HTML mockup
2. 用 Playwright 截圖
3. 用戶確認方向
4. 才開始寫 React 元件

共產出 5 份 mockup：
| Mockup | 用途 | 結果 |
|---|---|---|
| `mockup-dashboard.html` | Dashboard 新版面 | ✅ 確認實作 |
| `mockup-saved.html` | 收藏區 v1 | ⏭ 跳過，先改主頁 |
| `mockup-recommendations.html` | 推薦職缺列表 | ✅ 確認方向，用戶反饋太花 |
| `mockup-saved-v2.html` | 收藏區 v2（tab 切換） | ✅ 確認 tab 方案 |
| `mockup-find-job.html` | 最終版「找工作」 | ✅ 確認實作 |

**學到**：先確認視覺方向再寫 code，避免寫完才發現不對。也讓非工程背景的人可以直接看 mockup 給回饋。

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

## 技術債清單（截至 06-12）

| 優先 | 項目 | 說明 | 狀態 |
|---|---|---|---|
| 高 | Railway Gemini API Key | 沒設定 → 新爬 JD 沒 embedding → 永遠不進推薦池 | 未修 |
| ~~高~~ | ~~App 內容 layout 問題~~ | ~~`max-w-2xl` 置中在 sidebar 佈局下太窄~~ | ✅ 06-12 已修 |
| 高 | 爬蟲加 locationFilter 過濾 | User.locationFilter 已存 DB 但爬蟲/推薦未使用 | 已建 task |
| 中 | 站內職缺詳情頁 | 決定做 `/jobs/[jdId]`，目前點卡片開 104 外連 | 未做 |
| 中 | Landing page 實作 | mockup 確認後寫入 `app/page.tsx` | 未做 |
| 中 | 493 筆舊 JD backfill description | Python 爬蟲可做，尚未排程 | 未做 |
| 中 | 個人資料頁 UI 優化 | 版面空、缺引導 | 未做 |
| 中 | 手機登入驗收 | NEXTAUTH_URL 補上後未完整測試 | 未做 |
| 低 | GitHub Auto Deploy | GitHub App 未連，每次需手動部署 | 未做 |
| 低 | 關鍵字靜態問題 | 不會根據行為自動更新 | 未做 |

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

---

## 設計原則備忘（06-12 UI 改版歸納）

1. **首頁 = Dashboard，不是單一功能頁**：用戶進來應看到全局狀態，不是只有一個模組
2. **一個頁面一個核心動作**：推薦頁的核心就是「收藏」，不要塞投遞、準備等其他步驟的 CTA
3. **減少頁面跳轉**：編輯意圖用 Modal 比跳頁好，收藏和推薦用 tab 比分頁好
4. **先 mockup 再寫 code**：每次改版先確認視覺方向，避免寫完才發現不對
5. **顏色要克制**：多色 icon / badge 看起來繽紛但實際上很花，統一色系更專業
6. **CTA 跟著用戶流程走**：推薦→收藏→投遞→追蹤，每一步只做這一步的事
