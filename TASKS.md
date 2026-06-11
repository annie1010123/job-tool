# JobPilot — 開發任務清單

> 產出時間：2026-06-09
> 開發時程：8 週（W1-W8）
> 已完成：F1 登入 + F2 Onboarding + F3 爬蟲推薦+Email+Dashboard + Kanban + AI 面試題目 + 面試紀錄

---

## Phase 0：Landing Page + 試玩（W0, ~3 天）
> 目標：讓訪客/Reviewer 不需登入就能體驗 Aha Moment（貼 JD → 30 秒生成推薦信）

- [ ] **T0.1** Landing Page 靜態頁面
  - 驗收：
    - [ ] 訪問 `/` 顯示 Landing Page（不需登入）
    - [ ] 包含：一句話定位 + 核心功能介紹 + 試玩區域 + CTA 登入按鈕
    - [ ] 響應式設計（手機可用）

- [ ] **T0.2** 推薦信試玩 API
  - 驗收：
    - [ ] 不需登入即可使用
    - [ ] 用戶貼入 JD 文字 → 30 秒內回傳 AI 生成的推薦信草稿
    - [ ] API rate limiting：每 IP 每小時 5 次
    - [ ] 試玩結果不儲存

- [ ] **T0.3** 試玩 UI 元件
  - 驗收：
    - [ ] 文字輸入框 + 「生成推薦信」按鈕 + 結果展示區
    - [ ] Loading 狀態 + 錯誤處理
    - [ ] 結果下方有 CTA：「想儲存並管理更多？免費註冊」

> **Phase 0 檢查點**：Reviewer 可以在 30 秒內體驗到推薦信生成的 Aha Moment。

---

## Phase 1：職缺收藏 + 投遞流程（W1-W2, ~2 週）
> 目標：串起「推薦/收藏 → 投遞 → AI 推薦信」的完整路徑

- [ ] **T1.1** 資料庫 — 新增 SavedJob model
  - 驗收：
    - [ ] Prisma schema 新增 `SavedJob`（userId, jdId?, externalUrl, companyName, title, platform, companyType, status, savedAt）
    - [ ] Migration 成功執行
    - [ ] platform enum: `104` | `linkedin` | `cake` | `yourator` | `other`
    - [ ] status: `watching` | `ready_to_apply`

- [ ] **T1.2** 職缺收藏區頁面 `/saved`
  - 驗收：
    - [ ] 列表顯示所有收藏職缺，可按平台/公司類型篩選
    - [ ] 每個職缺卡片顯示：公司名、職稱、平台標籤、公司類型標籤、收藏日期
    - [ ] 支援刪除收藏

- [ ] **T1.3** 手動新增職缺（貼 URL）
  - 驗收：
    - [ ] 輸入 URL → 呼叫現有 `/api/parse-jd` 自動解析公司名+職稱
    - [ ] 解析失敗時可手動填寫
    - [ ] 選擇平台來源 + 公司類型
    - [ ] 儲存到 SavedJob

- [ ] **T1.4** Dashboard 推薦 → 一鍵收藏
  - 驗收：
    - [ ] 推薦清單每個職缺卡片新增「收藏」按鈕
    - [ ] 點擊後加入 SavedJob，按鈕變成「已收藏」
    - [ ] 重複收藏不報錯

- [ ] **T1.5** 收藏 → 投遞流程
  - 驗收：
    - [ ] 收藏區每個職缺有「投遞」按鈕
    - [ ] 點擊「投遞」→ 自動建立 Application（status: applied）+ 跳轉到 Kanban
    - [ ] 如果已有對應的 Application，直接跳轉

- [ ] **T1.6** Kanban 強化
  - 驗收：
    - [ ] 從收藏區投遞的職缺自動出現在 Kanban「已投遞」欄
    - [ ] 投遞日期自動記錄

> **Phase 1 檢查點**：用戶可以從 Dashboard 推薦 → 收藏 → 投遞，或手動貼 URL → 收藏 → 投遞。

---

## Phase 2：推薦信 AI 生成（W3-W4, ~2 週）
> 目標：投遞時一鍵生成客製化推薦信

- [ ] **T2.1** 推薦信生成 API `/api/cover-letter/generate`
  - 驗收：
    - [ ] 輸入：userId + jdId（或 JD 文字）
    - [ ] AI 根據（用戶履歷 + JD + 公司資訊）生成推薦信
    - [ ] 支援 3 種語氣參數：`formal` | `friendly` | `concise`
    - [ ] 回應時間 < 15 秒
    - [ ] 錯誤處理：履歷未上傳時提示先完成 Onboarding

- [ ] **T2.2** 推薦信生成 UI
  - 驗收：
    - [ ] 在投遞流程中（或 Application 詳情頁）可點「生成推薦信」
    - [ ] 語氣選擇器（正式/活潑/簡潔）
    - [ ] 生成中顯示 loading
    - [ ] 結果顯示在可編輯的文字區域
    - [ ] 「複製」按鈕一鍵複製到剪貼簿
    - [ ] 「重新生成」按鈕

- [ ] **T2.3** Landing Page 試玩串接
  - 驗收：
    - [ ] Landing Page 試玩功能呼叫同一套 AI 邏輯（但不需 userId）
    - [ ] 試玩使用簡化 prompt（無用戶履歷，僅根據 JD 生成通用版）

> **Phase 2 檢查點**：用戶可以在投遞時一鍵生成推薦信，微調後複製使用。

---

## Phase 3：面試錄音 + AI 復盤 + 題庫進化（W5-W7, ~3 週）
> 目標：核心差異化功能 — AI 從每次面試中學習

- [ ] **T3.1** 資料庫 — 新增 InterviewReview + QuestionBank models
  - 驗收：
    - [ ] `InterviewReview`：applicationId, audioUrl?, transcript?, extractedQA(Json), overallFeedback, createdAt
    - [ ] `QuestionBank`：userId, question, category, source(applicationId), userPerformance, frequency, createdAt
    - [ ] Migration 成功

- [ ] **T3.2** 錄音上傳 API `/api/applications/[id]/review/upload`
  - 驗收：
    - [ ] 接受音檔上傳（mp3/m4a/wav, max 50MB）
    - [ ] 儲存到 Supabase Storage（private bucket, signed URL）
    - [ ] 回傳 audioUrl

- [ ] **T3.3** Whisper 轉文字 API `/api/applications/[id]/review/transcribe`
  - 驗收：
    - [ ] 呼叫 OpenAI Whisper API 將錄音轉文字
    - [ ] 支援中文 + 英文混合
    - [ ] 轉錄結果存入 InterviewReview.transcript
    - [ ] 錯誤處理：檔案太大、格式不支援

- [ ] **T3.4** AI 萃取 Q&A + 復盤 `/api/applications/[id]/review/analyze`
  - 驗收：
    - [ ] 從 transcript 中萃取面試 Q&A（問題 + 你的回答摘要）
    - [ ] 每題評估回答品質（good / ok / needs_improvement）
    - [ ] 生成改善建議
    - [ ] 結果存入 InterviewReview.extractedQA + overallFeedback

- [ ] **T3.5** 手動填寫復盤（fallback）
  - 驗收：
    - [ ] 不上傳錄音也可以手動輸入面試題目和自己的回答
    - [ ] 同樣進入 AI 分析 pipeline（跳過 Whisper）
    - [ ] UI：快速填寫表單（題目 + 回答 + 自評）

- [ ] **T3.6** 復盤結果頁面 UI
  - 驗收：
    - [ ] Application 詳情頁新增「面試復盤」tab
    - [ ] 顯示：每題 Q&A + 品質標記 + 改善建議 + 整體反饋
    - [ ] 如果有錄音，可播放原始錄音

- [ ] **T3.7** Q&A → 題庫自動歸類
  - 驗收：
    - [ ] 復盤完成後，extractedQA 自動寫入 QuestionBank
    - [ ] 每題自動分類（behavioral / technical / system_design / other）
    - [ ] 記錄來源（哪間公司的面試）和用戶表現

- [ ] **T3.8** AI 面試準備進化版
  - 驗收：
    - [ ] `/api/applications/[id]/ai-questions` 升級
    - [ ] 出題邏輯：JD 語意 + QuestionBank 歷史高頻題加權
    - [ ] 有歷史資料的題目標注「⚡ 根據你上次面試經驗延伸」
    - [ ] 附上「上次你在類似題目的表現」和改善建議
    - [ ] 沒有歷史資料時退化為現有行為（純 JD 出題）

- [ ] **T3.9** 面試準備頁面 UI 升級
  - 驗收：
    - [ ] 題目清單有「歷史延伸」標記
    - [ ] 每題可展開看模範答案 + 歷史表現 + 改善建議
    - [ ] 底部引導：「完成這次面試的復盤，下次 AI 會更了解你」

> **Phase 3 檢查點**：用戶完成至少 1 次復盤後，下一次面試準備可以看到「根據歷史經驗延伸」的題目。這是 Primary Aha Moment。

---

## Phase 4：UI 優化 + 部署（W8, ~1 週）
> 目標：達到作品集展示水準，部署上線

- [ ] **T4.1** 統一設計語言
  - 驗收：
    - [ ] 所有頁面使用一致的色彩、字體、間距
    - [ ] 按鈕、卡片、表單元件風格統一
    - [ ] 響應式：手機/平板/桌面都可用

- [ ] **T4.2** 空狀態 + Loading 狀態
  - 驗收：
    - [ ] 每個列表頁面有空狀態引導（例：「還沒有收藏的職缺，去看看今天的推薦？」）
    - [ ] API 呼叫中顯示 skeleton / spinner
    - [ ] 錯誤狀態有友善提示

- [ ] **T4.3** 部署到 Vercel
  - 驗收：
    - [ ] 環境變數已設定
    - [ ] 公網 URL 可訪問
    - [ ] Landing Page 不需登入可正常使用

- [ ] **T4.4** README 作品集版
  - 驗收：
    - [ ] 一句話定位
    - [ ] 架構圖（可用 Mermaid）
    - [ ] 技術亮點 3 點（語意推薦 pipeline / AI 面試進化 / 錄音復盤）
    - [ ] Live Demo 連結
    - [ ] Product Spec 連結
    - [ ] 螢幕截圖或 Demo GIF

- [ ] **T4.5** 安全性檢查
  - 驗收：
    - [ ] 所有 API 需 auth（Landing Page 試玩除外）
    - [ ] Rate limiting 已設定
    - [ ] 環境變數不在程式碼中
    - [ ] Supabase RLS 啟用
    - [ ] CORS 只允許自己的 domain

> **Phase 4 檢查點**：公網 URL 可訪問，工程主管可以在 3 分鐘內看到完整 Demo。
