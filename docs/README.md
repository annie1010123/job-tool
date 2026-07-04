# docs/ 文件地圖

> 第一次打開這個專案？順序：`../CLAUDE.md`（技術棧與規範）→ `PRODUCT-CONTEXT.md`（產品是什麼）→ `FILE-MAP.md`（改功能去哪找檔案）。

## 現行文件（會持續更新）

| 檔案 | 內容 | 什麼時候讀 |
|------|------|-----------|
| [FILE-MAP.md](FILE-MAP.md) | 功能 → 檔案對照表 | 改任何功能之前 |
| [PRODUCT-CONTEXT.md](PRODUCT-CONTEXT.md) | 產品定位、功能狀態、決策記錄、Not Doing List | 做產品決策、規劃新功能 |
| [JobPilot-PRD-v5.0-retro.md](JobPilot-PRD-v5.0-retro.md) | 現行 PRD（開工前視角反推，作品集用） | 對外展示、面試 demo |
| [JobPilot-PRD-v4.0.html](JobPilot-PRD-v4.0.html) | 上一版 HTML PRD（流程圖、ERD、Wireframe 最完整） | 需要視覺化規格時 |
| [retro-combined.md](retro-combined.md) | 開發回顧合輯 | 寫作品集、複盤方法論 |

## 素材資料夾

| 資料夾 | 內容 |
|--------|------|
| [portfolio/](portfolio/) | 作品集素材：大綱、設計決策、技術踩坑、面試洞察、用戶故事 |
| [mockups/](mockups/) | 設計稿（只留最新的 interview-prep 展示稿） |
| [superpowers/](superpowers/) | 進行中的開發計畫與 spec |

## history/ 歸檔區（唯讀，不再更新）

已完成的開發任務清單（TASKS/TICKETS）與已執行完的歷史計畫/spec。找「當初為什麼這樣做」來這裡。

## 慣例

- 文件被新版取代時：舊版搬進 `history/`，不要原地堆版本號
- 一次性 script 執行完就刪，執行記錄寫進 commit message
- 新增現行文件時，回來更新這份地圖
