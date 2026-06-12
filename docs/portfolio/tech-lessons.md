# JobPilot — 技術踩坑紀錄

> 面試時挑 2-3 個最有故事性的講。每個坑都記錄：怎麼發現 → 根因 → 怎麼解 → 學到什麼。

## 踩坑總覽

| # | 坑 | 嚴重度 | 花了多久修 | 可避免嗎 |
|---|---|--------|-----------|---------|
| 1 | 爬蟲被 Cloudflare 擋 12 天 | 🔴 高 | 1 天重寫引擎 | ✅ Day 1 設監控 |
| 2 | 頁面跳轉慢 3-5 秒 | 🟡 中 | 半天 | ✅ 一開始就用 Link |
| 3 | Vercel build 失敗 | 🟡 中 | 1 小時 | ✅ 先跑乾淨 build |
| 4 | Railway IPv6 連不上 DB | 🟡 中 | 2 小時 | ✅ 部署後跑 smoke test |
| 5 | 新 JD 沒 embedding 永遠不進推薦池 | 🔴 高 | 未修 | ✅ 部署時核對 env vars |
| 6 | 493 筆舊 JD 沒有 description | 🟡 中 | 手動 patch | ✅ 爬蟲一開始就打 detail API |

---

## 坑 1：爬蟲被 Cloudflare 擋了 12 天（最有故事性）

**怎麼發現的：**
爬蟲從 05-28 就壞了，但到 06-10 我才發現。因為沒有任何監控——爬蟲跑了但沒有 alert 告訴我「新增 JD 數量 = 0」。

**根因：**
104 啟用了 Cloudflare Bot Management，對 headless Chromium 做 TLS fingerprint 偵測（JA3/JA4）。Playwright 的 TLS 指紋跟真實 Chrome 差太多，搜尋頁直接 307 → 403。

**怎麼解的：**
整個爬蟲引擎從 Playwright（Node.js）換成 Python + curl_cffi。curl_cffi 底層用 libcurl，可以完整偽裝 Chrome 的 TLS 指紋，Cloudflare 無法區分。

同時加了完整的反爬機制：
- TLS 指紋偽裝（`impersonate="chrome124"`）
- UA 池 + session 粘性
- 動態 Referer
- 隨機延遲 + 5% 機率額外等待
- 小時配額（1500 筆）
- 429 指數退避
- Circuit breaker（連續 5 錯就停）

**學到什麼：**
1. 外部依賴（爬蟲目標網站）是最大的風險——它隨時可以改規則
2. **Day 1 就要有監控**：爬蟲結束後檢查新增數 > 0，否則發 alert
3. 爬蟲 vs 反爬是持續的對抗，不是做一次就好

**面試怎麼講：**
> 「這件事教會我一個道理：不是你的程式碼寫對就沒事了。104 在我不知情的情況下升級了 Cloudflare，我的爬蟲靜默失敗了 12 天。如果我一開始就設了一個簡單的 alert——『新增 JD 數量 = 0 時通知我』——就能在第一天發現。」

---

## 坑 2：頁面跳轉慢 3-5 秒

**怎麼發現的：**
自己使用時覺得慢。

**根因（兩層）：**
1. 用了 `<a href>` 而不是 Next.js 的 `<Link>`，導致每次點連結都整頁 reload
2. NextAuth 用 `strategy: "database"`，每次 `auth()` 都要去 Supabase 查一次 session（~200ms）

**怎麼解的：**
三層修法：
1. 所有 `<a>` 換成 `<Link>`（client-side routing）
2. Auth 換成 JWT strategy（從 cookie 解碼，零 DB 查詢）
3. 每個 route 加 `loading.tsx` 骨架畫面

**學到什麼：**
這是框架基礎知識的問題。`<Link>` vs `<a>` 是 Next.js Day 1 就該知道的事，但我跳過了官方文件直接開始寫。

**面試怎麼講：**
> 「這個坑很基礎，但也因此印象深刻。Next.js 的 `<Link>` 做 client-side routing，`<a>` 做 full page reload。差別是瞬間 vs 3 秒。我後來給自己建了一個 checklist：每個新 Next.js 專案第一天就確認——內部連結一律 Link、Auth 用 JWT、每個 route 加 loading.tsx。」

---

## 坑 3：Railway 連不上 Supabase

**怎麼發現的：**
Railway 服務 crash，log 顯示 `psycopg2.OperationalError: Network is unreachable`

**根因：**
`DIRECT_URL` 設的是 Supabase 直連 hostname（`db.xxx.supabase.co`），Railway SFO region 把它解析為 IPv6 位址，但 Railway 容器不支援 IPv6。

**怎麼解的：**
換成 Supabase pooler hostname（IPv4）。

**學到什麼：**
部署到新平台時，不能假設本機能連就代表部署環境也能連。**部署後第一件事是跑 smoke test**——一個簡單的 DB query 確認連線 OK。

---

## 坑 4：Vercel build 失敗

**根因：**
Vercel 的 build 環境是全新的 `node_modules`，沒有 Prisma Client。需要在 build script 加 `prisma generate`。

**怎麼解的：**
```json
"build": "prisma generate && next build"
```

**學到什麼：**
本機開發時 Prisma Client 已經 cache 在 node_modules 裡，所以不會注意到。但 CI/CD 環境是乾淨的。**部署前先在本機模擬乾淨環境**：`rm -rf node_modules .next && pnpm install && pnpm build`

---

## 從踩坑中萃取的 Checklist

我把所有踩過的坑整理成一套 Dev Preflight Checklist（已建成 Claude Code skill）：

**開發前：**
- Design tokens 定義好
- 每個頁面先寫 mockup
- Schema 列出所有資料入口
- 外部依賴列表 + health check

**開發中：**
- 內部連結用 `<Link>`
- 每個 route 加 loading.tsx
- Auth 用 JWT
- 不用 window.prompt

**部署前：**
- 環境變數核對
- 乾淨 build 測試
- 外部連線 smoke test

**部署後：**
- 手機登入測試
- Cron 第一次執行確認
- 監控 / alert 設定
