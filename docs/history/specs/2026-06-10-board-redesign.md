# 投遞追蹤重設計 Design Spec

**日期：** 2026-06-10  
**範圍：** `/app/board/` 投遞追蹤主頁 + 職缺詳細頁 + AI 面試準備 Tab

---

## 一、背景與目標

現有 Kanban 設計以線性工作流為假設，但求職本質是「同時管理多個平行投注」，導致：
- 沒有「久沒回音」的出口
- 結果狀態過於模糊（offer vs 被刷無法區分）
- 詳細頁有雙 Tab bar 視覺衝突
- AI 面試準備的「已準備」沒有實質互動意義

目標：改為 CRM 漏斗式清單 + 雙模式切換，解決上述問題。

---

## 二、DB Schema 變更

### Application.status 值更新

| 舊值 | 新值 |
|------|------|
| `not_applied` | `not_applied`（不變）|
| `applied` | `applied`（不變）|
| `interviewing` | `interviewing`（不變）|
| `second_round` | **移除**，合併入 `interviewing` |
| `result` | **移除**，拆成 `offer` / `rejected` |

新增封存欄位（不用 status 表示，另立欄位）：

```prisma
model Application {
  // ... 現有欄位
  isArchived   Boolean   @default(false)
  archiveReason String?  // "ghosted" | "rejected" | "withdrew"
  archivedAt   DateTime?
}
```

### AiQuestion JSON 結構新增欄位

```ts
{
  question: string
  type: "行為題" | "技術題" | "動機題" | "情境題"
  round: number          // 第幾輪（新增）
  prepared: boolean
  answerDraft: string    // 使用者寫的答案草稿（新增）
  hidden: boolean        // 隱藏而非刪除（新增）
  askedInInterview: boolean  // 面試真的有問到（新增）
  fromHistory: boolean
  relatedCompany: string | null
  previousPerformance: string | null
  improvementTip: string | null
}
```

---

## 三、投遞追蹤主頁（`/board`）

### 3.1 頁面架構

```
[Header: 標題 + 模式切換（清單｜看板）+ 新增職缺]
[漏斗統計列]
[主列表 / 看板區域]
[封存區（預設收起）]
```

**模式切換：** 預設清單模式，切換後不持久化（每次進入頁面都是清單模式）。

### 3.2 漏斗統計列

顯示：`投遞中 N` → `面試中 N（轉換率 X%）` → `Offer N（轉換率 X%）` + `已封存 N`

- 只算 `isArchived = false` 的職缺
- Offer 轉換率 = offer 數 ÷ applied 數

### 3.3 清單模式（預設）

**分群順序：** `interviewing` → `applied` → `not_applied`

**欄位：** 公司 ｜ 職缺 ｜ 狀態 ｜ 天數 ｜ CTA

**天數欄說明：**
- `not_applied`：留空
- `applied`：距今投遞天數（`createdAt` 或 `appliedAt`）
- `interviewing`：顯示最近面試日期倒數（`scheduledAt`），若無則留空
- `offer` / `rejected`：留空

**CTA 邏輯：**

| 狀態 | 條件 | CTA |
|------|------|-----|
| `not_applied` | — | 寫推薦信 |
| `applied` | 投遞天數 ≥ 14 | 封存（橘色警示） |
| `applied` | 天數 < 14 | 無 |
| `interviewing` | — | 準備面試 |
| `offer` / `rejected` | — | 封存 |

**「久沒回音」樣式：** 卡片左邊框橘色 `border-left: 3px solid #f97316`，狀態顯示「⚠ 久沒回音」badge。

### 3.4 看板模式

4 欄（移除原本的「二面」欄）：
`未投遞` ｜ `投遞中` ｜ `面試中` ｜ `結果`

- `面試中` 的卡片顯示「第 N 輪」badge，N = `interviewRecords.length`
- 久沒回音的卡片保留橘色左邊框
- 空欄顯示虛線佔位框

### 3.5 封存區

位置：頁面最底部，預設收起。

展開後顯示列表，欄位：公司 ｜ 職缺 ｜ 封存原因 ｜ 封存日期 ｜ 復原按鈕

封存原因選項：`久沒回音` ｜ `收到感謝信` ｜ `主動放棄`

---

## 四、職缺詳細頁（`/board/[applicationId]`）

### 4.1 Header Card

```
[職稱]
[公司名稱]  [公司類型 badge]          [封存 按鈕]

[狀態下拉 badge]  [第 N 輪 chip]  [面試 日期 chip]
```

**狀態下拉選單選項：**
- 未投遞 / 投遞中 / 面試中 / 錄取 🎉 / 感謝信（被刷）

狀態切換後出現 toast：「狀態已更新為 X」+ 復原按鈕（3 秒後自動消失）。

### 4.2 預設 Tab 邏輯（解決 Context-aware default）

| 狀態 | 預設 Tab |
|------|---------|
| `not_applied` | 推薦信 |
| `applied` | 面試準備 |
| `interviewing` | 面試準備 |
| `offer` / `rejected` | 面試復盤 |

### 4.3 Tab 順序

`面試準備` ｜ `推薦信` ｜ `面試復盤` ｜ `職缺資訊`

### 4.4 封存流程

點「封存」按鈕 → 底部 sheet 詢問原因（久沒回音 / 收到感謝信 / 主動放棄）→ 確認後返回主頁。

---

## 五、AI 面試準備 Tab

### 5.1 工具列

```
[第 1 輪][第 2 輪][+ 新增輪次]     [手動加題] [補充題目]
```

- **補充題目**：呼叫 AI 生成更多題，不動現有已準備題目
- **重新生成**：全清重來，若有已準備題目則跳確認對話框

進度列：`N / 總數 已準備`，N = `prepared = true` 且 `hidden = false` 的數量。

### 5.2 題目卡片

**收起狀態：**
```
[checkbox] 題目文字                    [題型 tag] [面試有問到] [隱藏]  [▼]
```

**展開狀態：**
```
[答題方向 hint box - 黃底]
[若 fromHistory: 歷史記錄 box - 紫底，顯示上次回答 + improvementTip]
[我的答案 textarea]
[儲存]  [標記已準備]
```

### 5.3「面試有問到」互動

按下後：
1. 卡片邊框變綠、checkbox 變綠勾、出現「✓ 面試問到了」badge
2. 展開區顯示「去復盤 →」按鈕，點擊跳到面試復盤 Tab 並帶入該題

### 5.4「隱藏」互動

- 題目移至列表最底部，opacity 降低，不計入進度
- 可展開「已隱藏的題目」區塊復原

### 5.5 面試結束後觸發的 Checklist

觸發時機：`status` 從 `interviewing` 改為 `offer` / `rejected`

顯示 modal：「面試結束！哪些題目有被問到？」+ 當前輪次所有題目的快速勾選清單 + 完成 / 跳過按鈕。

勾選後自動標記 `askedInInterview = true`，並導向面試復盤 Tab。

---

## 六、不在本次範圍

- 推薦信 Tab 內容（現有功能不動）
- 面試復盤 Tab 內容（現有功能不動）
- 職缺資訊 Tab 內容（現有功能不動）
- 行動裝置響應式（現有 RWD 保留）
- AI 題目生成的 prompt 調整（另外做）
