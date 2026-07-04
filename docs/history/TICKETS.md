# JobPilot — 開票清單

> 產出時間：2026-06-09
> 對應 TASKS.md 版本：2026-06-09
> 共 22 張票

---

## 票務總覽

| 票號 | 標題 | Phase | 優先級 | 預估工時 | 依賴 |
|------|------|-------|--------|---------|------|
| TKT-001 | Landing Page 靜態頁面 | P0 | P0 | 4h | — |
| TKT-002 | 推薦信試玩 API | P0 | P0 | 3h | — |
| TKT-003 | 試玩 UI 元件 | P0 | P0 | 3h | TKT-001, TKT-002 |
| TKT-004 | 新增 SavedJob model + migration | P1 | P0 | 2h | — |
| TKT-005 | 職缺收藏區頁面 | P1 | P0 | 4h | TKT-004 |
| TKT-006 | 手動新增職缺（貼 URL） | P1 | P0 | 3h | TKT-004 |
| TKT-007 | Dashboard 推薦一鍵收藏 | P1 | P0 | 2h | TKT-004 |
| TKT-008 | 收藏 → 投遞流程 | P1 | P0 | 3h | TKT-005 |
| TKT-009 | Kanban 強化 | P1 | P0 | 2h | TKT-008 |
| TKT-010 | 推薦信生成 API | P2 | P0 | 6h | — |
| TKT-011 | 推薦信生成 UI | P2 | P0 | 4h | TKT-010 |
| TKT-012 | Landing Page 試玩串接 | P2 | P1 | 2h | TKT-002, TKT-010 |
| TKT-013 | 新增 InterviewReview + QuestionBank models | P3 | P0 | 3h | — |
| TKT-014 | 錄音上傳 API | P3 | P0 | 3h | TKT-013 |
| TKT-015 | Whisper 轉文字 API | P3 | P0 | 4h | TKT-014 |
| TKT-016 | AI 萃取 Q&A + 復盤 API | P3 | P0 | 6h | TKT-015 |
| TKT-017 | 手動填寫復盤（fallback） | P3 | P0 | 3h | TKT-013 |
| TKT-018 | 復盤結果頁面 UI | P3 | P0 | 4h | TKT-016, TKT-017 |
| TKT-019 | Q&A → 題庫自動歸類 | P3 | P0 | 3h | TKT-016 |
| TKT-020 | AI 面試準備進化版 | P3 | P0 | 6h | TKT-019 |
| TKT-021 | 面試準備頁面 UI 升級 | P3 | P0 | 4h | TKT-020 |
| TKT-022 | UI 優化 + 部署 + README | P4 | P0 | 8h | 全部 |

---

## TKT-001：Landing Page 靜態頁面

**Phase**：Phase 0 — Landing Page
**對應 Task**：T0.1
**優先級**：P0
**預估工時**：4 小時
**依賴**：無

### 描述

建立 JobPilot 的 Landing Page，不需登入即可訪問。這是工程主管看到的第一個畫面，必須在 10 秒內讓人理解產品做什麼。包含一句話定位、核心功能介紹、推薦信試玩區域、登入 CTA。

### User Story

身為作品集 Reviewer，我想要不需註冊就能看到產品介紹和體驗核心功能，以便在 3 分鐘內判斷候選人的技術能力。

### 驗收標準

- [ ] 訪問 `/` 顯示 Landing Page（不需登入）
- [ ] 包含：一句話定位 + 核心功能介紹（4 大功能卡片）+ 試玩區域 + CTA 登入按鈕
- [ ] 響應式設計（手機/桌面）
- [ ] 頁面載入 < 2 秒

### 技術備註

- 修改 `app/page.tsx`（目前可能 redirect 到 login）
- 使用 Server Component（靜態渲染）
- 設計風格參考現有 Dashboard 的暖色調（#f1efe8 背景）

### 標籤建議

`Phase 0` `frontend` `landing`

---

## TKT-002：推薦信試玩 API

**Phase**：Phase 0
**對應 Task**：T0.2
**優先級**：P0
**預估工時**：3 小時
**依賴**：無

### 描述

提供一個不需認證的 API，讓訪客貼入 JD 文字後生成推薦信草稿。這是 Landing Page Aha Moment 的後端。需要 rate limiting 防止濫用。

### 驗收標準

- [ ] `POST /api/cover-letter/try` 不需 auth
- [ ] 輸入：JD 文字（string）
- [ ] 輸出：推薦信草稿（string）
- [ ] 回應時間 < 15 秒
- [ ] Rate limiting：每 IP 每小時 5 次
- [ ] JD 為空或太短時回傳友善錯誤

### 技術備註

- 使用 GPT-4o-mini
- Prompt：根據 JD 生成通用推薦信（無用戶履歷）
- Rate limiting 可用 `next-api-rate-limit` 或自建（基於 IP）

### 標籤建議

`Phase 0` `backend` `api` `llm`

---

## TKT-003：試玩 UI 元件

**Phase**：Phase 0
**對應 Task**：T0.3
**優先級**：P0
**預估工時**：3 小時
**依賴**：TKT-001, TKT-002

### 驗收標準

- [ ] Landing Page 內嵌試玩區域
- [ ] 文字輸入框（textarea）+ 「生成推薦信」按鈕
- [ ] Loading spinner + streaming 效果（如可行）
- [ ] 結果展示在美觀的卡片中
- [ ] 「複製」按鈕
- [ ] 結果下方 CTA：「想儲存並管理更多？免費註冊 →」
- [ ] 錯誤狀態友善提示

### 標籤建議

`Phase 0` `frontend` `landing`

---

## TKT-004：新增 SavedJob model + migration

**Phase**：Phase 1
**對應 Task**：T1.1
**優先級**：P0
**預估工時**：2 小時
**依賴**：無

### 描述

在 Prisma schema 中新增 SavedJob model，用於儲存用戶收藏的職缺。支援來自不同平台的職缺，以及手動新增的職缺。

### 驗收標準

- [ ] Prisma schema 新增 `SavedJob` model
- [ ] 欄位：id, userId, jdId(optional), externalUrl, companyName, title, platform, companyType, status, savedAt
- [ ] platform: `104` | `linkedin` | `cake` | `yourator` | `other`
- [ ] companyType: `startup` | `large` | `traditional` | null
- [ ] status: `watching` | `ready_to_apply`
- [ ] `@@unique([userId, externalUrl])` 防重複收藏
- [ ] Migration 成功執行

### 標籤建議

`Phase 1` `database` `schema`

---

## TKT-005：職缺收藏區頁面

**Phase**：Phase 1
**對應 Task**：T1.2
**優先級**：P0
**預估工時**：4 小時
**依賴**：TKT-004

### 驗收標準

- [ ] 新頁面 `/saved`
- [ ] 列表顯示所有收藏的職缺
- [ ] 可按平台篩選（全部/104/LinkedIn/Cake/其他）
- [ ] 可按公司類型篩選（全部/新創/大公司/傳產）
- [ ] 卡片顯示：公司名、職稱、平台標籤、公司類型標籤、收藏日期
- [ ] 支援刪除收藏
- [ ] 空狀態：「還沒有收藏的職缺，去看看今天的推薦？」
- [ ] Header 有導航（← 回推薦 / 投遞追蹤 →）

### 標籤建議

`Phase 1` `frontend` `saved-jobs`

---

## TKT-006：手動新增職缺（貼 URL）

**Phase**：Phase 1
**對應 Task**：T1.3
**優先級**：P0
**預估工時**：3 小時
**依賴**：TKT-004

### 驗收標準

- [ ] 收藏區頁面有「+ 新增職缺」按鈕
- [ ] Modal：輸入 URL → 呼叫 `/api/parse-jd` 自動解析
- [ ] 自動填入公司名、職稱
- [ ] 解析失敗時可手動填寫
- [ ] 選擇平台來源（下拉選單）
- [ ] 選擇公司類型（可選）
- [ ] 儲存成功後加入列表

### 標籤建議

`Phase 1` `frontend` `backend` `saved-jobs`

---

## TKT-007：Dashboard 推薦一鍵收藏

**Phase**：Phase 1
**對應 Task**：T1.4
**優先級**：P0
**預估工時**：2 小時
**依賴**：TKT-004

### 驗收標準

- [ ] `RecommendationList` 每張卡片新增「收藏」按鈕
- [ ] 點擊 → `POST /api/saved-jobs`（自動帶入 jdId + 資訊）
- [ ] 按鈕變成「已收藏 ✓」
- [ ] 重複收藏不報錯（冪等）
- [ ] API：`POST /api/saved-jobs` + `DELETE /api/saved-jobs/[id]`

### 標籤建議

`Phase 1` `frontend` `backend` `dashboard`

---

## TKT-008：收藏 → 投遞流程

**Phase**：Phase 1
**對應 Task**：T1.5
**優先級**：P0
**預估工時**：3 小時
**依賴**：TKT-005

### 驗收標準

- [ ] 收藏區每張卡片有「投遞」按鈕
- [ ] 點擊 → 建立 Application（status: applied, appliedAt: now）
- [ ] 自動跳轉到 `/board`
- [ ] 如果已有對應 Application，跳過建立直接跳轉
- [ ] SavedJob status 更新為 `applied`（可選）

### 標籤建議

`Phase 1` `frontend` `backend` `application-flow`

---

## TKT-009：Kanban 強化

**Phase**：Phase 1
**對應 Task**：T1.6
**優先級**：P0
**預估工時**：2 小時
**依賴**：TKT-008

### 驗收標準

- [ ] 從收藏區投遞的職缺自動出現在「已投遞」欄
- [ ] 投遞日期自動顯示
- [ ] Kanban header 新增導航：「← 回推薦 | 收藏區」

### 標籤建議

`Phase 1` `frontend` `kanban`

---

## TKT-010：推薦信生成 API

**Phase**：Phase 2
**對應 Task**：T2.1
**優先級**：P0
**預估工時**：6 小時
**依賴**：無

### 描述

核心 AI 功能。根據用戶的履歷 + JD + 公司資訊，生成高品質的客製化推薦信。這是 RICE 分數最高的功能，也是訪談中用戶最願意付費的功能。

### 驗收標準

- [ ] `POST /api/cover-letter/generate`（需 auth）
- [ ] 輸入：applicationId 或 jdId + tone（`formal` | `friendly` | `concise`）
- [ ] AI 讀取用戶 Resume 結構化資料 + JD 資訊，生成推薦信
- [ ] 回應時間 < 15 秒
- [ ] 推薦信長度：300-500 字
- [ ] 包含：開頭（為什麼對這間公司有興趣）+ 中段（匹配的技能和經驗）+ 結尾（期待面試）
- [ ] 履歷未上傳時回傳 400 + 友善錯誤訊息
- [ ] Prompt 模板支援中英文

### 技術備註

- GPT-4o-mini，temperature 0.7
- Prompt 需要注入：resume.skills, resume.title, resume.seniority, jd.title, jd.companyName, jd.skills, jd.description
- 三種語氣用不同的 system prompt

### 標籤建議

`Phase 2` `backend` `api` `llm` `cover-letter`

---

## TKT-011：推薦信生成 UI

**Phase**：Phase 2
**對應 Task**：T2.2
**優先級**：P0
**預估工時**：4 小時
**依賴**：TKT-010

### 驗收標準

- [ ] Application 詳情頁新增「推薦信」tab
- [ ] 語氣選擇器（正式/活潑/簡潔），預設正式
- [ ] 「生成推薦信」按鈕 + loading 狀態
- [ ] 結果顯示在可編輯的 textarea
- [ ] 「複製」按鈕 + toast 提示「已複製」
- [ ] 「重新生成」按鈕

### 標籤建議

`Phase 2` `frontend` `cover-letter`

---

## TKT-012：Landing Page 試玩串接推薦信 API

**Phase**：Phase 2
**對應 Task**：T2.3
**優先級**：P1
**預估工時**：2 小時
**依賴**：TKT-002, TKT-010

### 驗收標準

- [ ] Landing Page 試玩 API 使用與正式版相同的 prompt 架構
- [ ] 差異：無 userId，使用簡化 prompt（僅根據 JD）
- [ ] 試玩版品質接近正式版

### 標籤建議

`Phase 2` `backend` `landing`

---

## TKT-013：新增 InterviewReview + QuestionBank models

**Phase**：Phase 3
**對應 Task**：T3.1
**優先級**：P0
**預估工時**：3 小時
**依賴**：無

### 驗收標準

- [ ] `InterviewReview`：id, applicationId, audioUrl?, transcript?, extractedQA(Json), overallFeedback?, createdAt
- [ ] `QuestionBank`：id, userId, question, answer?, category, sourceApplicationId?, userPerformance?, frequency(default 1), createdAt, updatedAt
- [ ] category enum: `behavioral` | `technical` | `system_design` | `culture_fit` | `other`
- [ ] userPerformance enum: `good` | `ok` | `needs_improvement` | null
- [ ] Migration 成功

### 標籤建議

`Phase 3` `database` `schema`

---

## TKT-014：錄音上傳 API

**Phase**：Phase 3
**對應 Task**：T3.2
**優先級**：P0
**預估工時**：3 小時
**依賴**：TKT-013

### 驗收標準

- [ ] `POST /api/applications/[id]/review/upload`
- [ ] 接受 mp3/m4a/wav，max 50MB
- [ ] 上傳到 Supabase Storage private bucket
- [ ] 回傳 signed URL（1 小時有效）
- [ ] 建立 InterviewReview 記錄
- [ ] 檔案大小/格式驗證 + 錯誤處理

### 標籤建議

`Phase 3` `backend` `storage` `review`

---

## TKT-015：Whisper 轉文字 API

**Phase**：Phase 3
**對應 Task**：T3.3
**優先級**：P0
**預估工時**：4 小時
**依賴**：TKT-014

### 驗收標準

- [ ] `POST /api/applications/[id]/review/transcribe`
- [ ] 從 Supabase Storage 下載音檔 → 呼叫 OpenAI Whisper API
- [ ] 支援中英文混合
- [ ] 轉錄結果存入 InterviewReview.transcript
- [ ] 處理時間提示（長錄音可能需 1-2 分鐘）
- [ ] 錯誤處理：Whisper API 失敗時 retry 1 次

### 技術備註

- OpenAI Whisper API：`whisper-1`，$0.006/min
- 30 分鐘面試 ≈ $0.18

### 標籤建議

`Phase 3` `backend` `llm` `whisper` `review`

---

## TKT-016：AI 萃取 Q&A + 復盤 API

**Phase**：Phase 3
**對應 Task**：T3.4
**優先級**：P0
**預估工時**：6 小時
**依賴**：TKT-015

### 描述

核心差異化功能的後端。從面試逐字稿中萃取 Q&A，評估回答品質，生成改善建議。

### 驗收標準

- [ ] `POST /api/applications/[id]/review/analyze`
- [ ] 輸入：transcript（來自 Whisper 或手動輸入）
- [ ] 輸出 extractedQA：`[{ question, answer_summary, quality, improvement_tip }]`
- [ ] quality: `good` | `ok` | `needs_improvement`
- [ ] 輸出 overallFeedback：整體表現摘要 + 3 個改善重點
- [ ] 結果存入 InterviewReview
- [ ] GPT-4o-mini，structured output（JSON mode）

### 標籤建議

`Phase 3` `backend` `llm` `review` `core-feature`

---

## TKT-017：手動填寫復盤

**Phase**：Phase 3
**對應 Task**：T3.5
**優先級**：P0
**預估工時**：3 小時
**依賴**：TKT-013

### 驗收標準

- [ ] Application 詳情頁有「手動記錄面試」選項
- [ ] 表單：可動態新增多題（題目 + 我的回答 + 自評）
- [ ] 送出後建立 InterviewReview（無 audioUrl、無 transcript）
- [ ] 自動進入 AI 分析（TKT-016 的 analyze API，用手動輸入替代 transcript）
- [ ] UI 簡潔，1 分鐘內可填完

### 標籤建議

`Phase 3` `frontend` `backend` `review`

---

## TKT-018：復盤結果頁面 UI

**Phase**：Phase 3
**對應 Task**：T3.6
**優先級**：P0
**預估工時**：4 小時
**依賴**：TKT-016, TKT-017

### 驗收標準

- [ ] Application 詳情頁新增「面試復盤」tab
- [ ] 顯示每題 Q&A + 品質標記（綠/黃/紅）+ 改善建議
- [ ] 整體反饋區塊
- [ ] 有錄音時可播放（audio player）
- [ ] 無復盤時顯示：「上傳錄音或手動記錄，AI 幫你分析」

### 標籤建議

`Phase 3` `frontend` `review`

---

## TKT-019：Q&A → 題庫自動歸類

**Phase**：Phase 3
**對應 Task**：T3.7
**優先級**：P0
**預估工時**：3 小時
**依賴**：TKT-016

### 驗收標準

- [ ] 復盤完成後（TKT-016 analyze 成功），extractedQA 自動寫入 QuestionBank
- [ ] 每題自動分類（behavioral / technical / system_design / other）
- [ ] 記錄 sourceApplicationId + userPerformance
- [ ] 重複題目（語意相似）合併，frequency +1
- [ ] API 或 background job 均可

### 標籤建議

`Phase 3` `backend` `question-bank` `core-feature`

---

## TKT-020：AI 面試準備進化版

**Phase**：Phase 3
**對應 Task**：T3.8
**優先級**：P0
**預估工時**：6 小時
**依賴**：TKT-019

### 描述

升級現有的 AI 面試題目生成，加入歷史題庫加權，實現「AI 越來越精準」的核心承諾。

### 驗收標準

- [ ] 升級 `/api/applications/[id]/ai-questions`
- [ ] 出題邏輯：70% 基於 JD 語意 + 30% 基於 QuestionBank 歷史高頻題
- [ ] 有歷史資料的題目標注 `fromHistory: true` + `relatedApplication` 資訊
- [ ] 附上 `previousPerformance` + `improvementTip`
- [ ] 沒有歷史資料時退化為純 JD 出題（backward compatible）
- [ ] 回傳 8-10 題

### 技術備註

- 查詢 QuestionBank where userId，按 category 分組
- Prompt 注入歷史題目 + 表現資料
- 考慮用 embedding 比對 JD 和歷史題目的相關性

### 標籤建議

`Phase 3` `backend` `llm` `question-bank` `core-feature`

---

## TKT-021：面試準備頁面 UI 升級

**Phase**：Phase 3
**對應 Task**：T3.9
**優先級**：P0
**預估工時**：4 小時
**依賴**：TKT-020

### 驗收標準

- [ ] 題目清單中，歷史延伸的題目有 ⚡ 標記 + 「根據你在 [公司名] 的面試經驗延伸」
- [ ] 每題可展開看：模範答案 + 上次表現 + 改善建議
- [ ] 非歷史題目正常顯示（無標記）
- [ ] 底部引導：「完成這次面試的復盤，下次 AI 會更了解你 💪」
- [ ] 載入狀態 + 空狀態

### 標籤建議

`Phase 3` `frontend` `interview-prep`

---

## TKT-022：UI 優化 + 部署 + README

**Phase**：Phase 4
**對應 Task**：T4.1 ~ T4.5
**優先級**：P0
**預估工時**：8 小時
**依賴**：全部

### 驗收標準

- [ ] 統一設計語言：色彩、字體、間距一致
- [ ] 每個列表有空狀態引導
- [ ] 所有 API call 有 loading 狀態
- [ ] 響應式設計通過（手機/平板/桌面）
- [ ] Vercel 部署成功，公網 URL 可訪問
- [ ] 環境變數已設定（不在程式碼中）
- [ ] README：一句話定位 + 架構圖 + 技術亮點 + Demo 連結 + 截圖
- [ ] 安全性：auth 保護 + rate limiting + RLS + CORS

### 標籤建議

`Phase 4` `frontend` `infra` `deploy` `docs`
