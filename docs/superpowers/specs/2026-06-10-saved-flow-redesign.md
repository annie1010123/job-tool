# 收藏區與投遞流程重設計 Spec

**日期：** 2026-06-10  
**目標：** 讓 Dashboard → 收藏 → 投遞 三個階段的流程直觀、資料不斷鏈。頁面視覺外觀維持不動，只改資料流與按鈕行為。

---

## 背景與問題

目前流程：
- Dashboard `+ 加入追蹤` → 直接建立 Application(status=not_applied) → 進投遞追蹤
- 收藏區 (SavedJob) 是獨立 model，和 Application 沒有關聯
- 投遞後，推薦信、用哪份履歷等資訊無法從投遞追蹤查到

新流程目標：
```
發現 → 收藏 (watching) → 寫推薦信 → 一鍵投遞 (applied) → 追蹤
```

---

## 設計決策

### 核心：新增 `watching` 狀態

Application.status 新增 `watching` 作為第一個階段：

```
watching → applied → interviewing → offer / rejected
```

- `watching`：已收藏，還在準備推薦信，不出現在投遞追蹤
- `applied`：已投遞，出現在投遞追蹤，appliedAt 記錄投遞日期

### SavedJob model

不再新增資料，現有資料保留不動。收藏區改由 Application(watching) 驅動。

---

## Schema 變更

### Application model 新增欄位

```prisma
resumeUrl  String?   // 選填，Canva 連結或 PDF URL，記錄投遞時使用的履歷
```

`status` 欄位已是 String，`watching` 直接使用，不需 migration。  
`appliedAt` 欄位已存在。

執行：`pnpm prisma db push`

---

## 各頁面改動

### 1. Dashboard (`app/dashboard/_components/TrackButton.tsx`)

| 項目 | 現在 | 改後 |
|------|------|------|
| 按鈕文字 | `+ 加入追蹤` | `收藏` |
| 點擊行為 | 建立 Application(status=not_applied) | 建立 Application(status=watching) |
| 完成後提示 | `已加入未投遞 ✓ 查看` | `已收藏 ✓ → 去收藏區` (連結到 /saved) |

### 2. 收藏區 (`app/saved/`)

**資料來源改變：**
- `page.tsx`：改查 `Application(status=watching)` 而非 `SavedJob`
- 不再需要 `SavedJobList` 的 platform/type filter 對 SavedJob 的查詢（改查 Application 的對應欄位）

**`SavedJobList.tsx` 改為 `WatchingJobList.tsx`（或直接改現有檔案）：**

每張卡片顯示（layout 不動，內容調整）：
- 公司名、職缺名（從 `Application.jd` 取）
- 平台 badge（從 `Application.jd.source` 取）
- 公司類型（從 `Application.companyType` 取）
- 推薦信狀態：有草稿（`coverLetter` 非空）→ 顯示「草稿中」；否則「尚未撰寫」
- 操作按鈕：「準備推薦信」（→ `/board/[id]`，預設推薦信 tab）、「投遞」、「刪除」

**「投遞」按鈕行為（一鍵，不跳 Modal）：**
```
PATCH /api/applications/:id
body: { status: "applied", appliedAt: new Date().toISOString() }
```
完成後從列表消失，不跳頁。

**「刪除」按鈕：**
```
DELETE /api/applications/:id
```

**手動新增職缺（`AddJobModal`）：**
- 貼 URL → 呼叫 `POST /api/parse-jd` 取得或建立 Jd 記錄
- 取得 jdId 後建立 Application(watching)
- 若 parse 失敗，顯示錯誤提示

### 3. 投遞追蹤 (`app/board/page.tsx`)

查詢條件加上排除 watching：

```ts
// 現在
where: { userId, isArchived: false }

// 改後
where: { userId, isArchived: false, status: { not: "watching" } }
```

### 4. Application 詳細頁 (`app/board/[applicationId]/page.tsx`)

**預設 tab：**
- `watching` → 預設開「推薦信」tab（與 `not_applied` 相同行為，現有 `getDefaultTab` 加一條）

**履歷欄位（`ApplicationDetail.tsx` 或 detail page）：**
- 在詳細頁加一個「履歷連結」文字輸入欄（選填）
- 儲存至 `Application.resumeUrl`
- placeholder：`Canva 連結、PDF URL…`

### 5. API 路由

**`app/api/applications/route.ts` (POST)：**
- 現在預設建 `status: "not_applied"`
- 改為接受 `status` 欄位，若未提供則預設 `"not_applied"`（向下相容）

**`app/api/applications/[id]/route.ts` (PATCH)：**
- 已支援 `status`、`appliedAt`
- 新增 `resumeUrl` 欄位支援

---

## 不改動的部分

- 頁面視覺外觀、Tailwind class、顏色、layout 全部保持不動
- SavedJob model 保留（現有資料不刪）
- 投遞追蹤的看板/清單視圖、漏斗、封存功能不動
- Auth、session、其他 API 不動

---

## 驗收標準

1. Dashboard 點「收藏」→ 收藏區出現該職缺（status=watching）
2. 收藏區點「投遞」→ appliedAt=今天，職缺消失，投遞追蹤出現
3. 投遞追蹤不顯示 watching 的職缺
4. 收藏區點「準備推薦信」→ 進入 `/board/[id]` 並預設顯示推薦信 tab
5. 投遞後在 `/board/[id]` 還是看得到推薦信內容
6. 詳細頁可以填/編輯 resumeUrl
7. 手動新增職缺（貼 URL）→ 進收藏區（watching），parse 失敗有錯誤提示
