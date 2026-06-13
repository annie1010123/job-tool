# 功能 → 檔案對照地圖

> 改某個功能時，直接查這張表開對應檔案，不用全專案翻。
> 路徑慣例：`page.tsx` = 路由頁（伺服器元件，抓資料）、`_components/` = 該頁的 UI、`app/api/.../route.ts` = 後端 API、`lib/` = 可重用邏輯。
> last-updated: 2026-06-13

---

## 🔐 登入 / Auth
| 要做的事 | 檔案 |
|---------|------|
| 登入頁、驗證信頁 | `app/(auth)/login/page.tsx`、`app/(auth)/verify-request/page.tsx` |
| NextAuth 設定（magic link + Google、JWT 策略） | `auth.ts` |
| Auth API handler | `app/api/auth/[...nextauth]/route.ts` |

## 🚀 Onboarding（履歷 + 求職意圖）
| 要做的事 | 檔案 |
|---------|------|
| Onboarding 流程頁 | `app/onboarding/page.tsx`、`onboarding/resume/page.tsx`、`onboarding/intent/page.tsx` |
| 履歷上傳 + 解析 | `app/api/resume/upload/route.ts`、`lib/resume/parse.ts`、`lib/resume/embed.ts` |
| 求職意圖儲存 / LLM 關鍵字擴展 | `app/api/intent/route.ts`、`app/api/intent/expand/route.ts`、`lib/intent/expand.ts` |

## 🔍 找工作 / 推薦（F5）— `/saved`
| 要做的事 | 檔案 |
|---------|------|
| 頁面（抓推薦資料、判斷已儲存） | `app/saved/page.tsx` |
| 職缺清單 + 篩選排序 | `app/saved/_components/FindJobPage.tsx` |
| 職缺詳情 Modal（左欄 JD、右欄推薦信、申請/投遞） | `app/saved/_components/JobDetailModal.tsx` |
| 手動貼 URL 新增職缺 | `app/saved/_components/AddJobModal.tsx`、`app/api/parse-jd/route.ts` |
| 編輯求職意圖 Modal | `app/saved/_components/IntentEditModal.tsx` |
| 收藏 / 申請 / 狀態建立 | `app/api/applications/route.ts` |
| 配對分數 / 推薦理由 | `lib/match/score.ts`、`lib/match/reason.ts`、`lib/match/preview.ts`、`lib/jd/embed.ts` |

## 📋 求職追蹤 / 看板（F6）— `/board`
| 要做的事 | 檔案 |
|---------|------|
| 看板頁（抓所有申請） | `app/board/page.tsx` |
| Kanban 拖曳改狀態 | `app/board/_components/KanbanBoard.tsx` |
| 漏斗轉換率 | `app/board/_components/BoardFunnel.tsx` |
| 清單檢視 | `app/board/_components/BoardListView.tsx` |
| 已封存區 | `app/board/_components/ArchiveSection.tsx` |
| 單筆申請詳情（改狀態、公司類型、日期、備註） | `app/board/_components/ApplicationDetail.tsx` |
| 單筆申請頁（分頁容器） | `app/board/[applicationId]/page.tsx`、`_components/ApplicationTabs.tsx` |
| 改狀態 / 改欄位 / 刪除 API | `app/api/applications/[id]/route.ts` |

## 📝 推薦信（F7）
| 要做的事 | 檔案 |
|---------|------|
| 詳情頁的推薦信生成（登入後） | `app/api/cover-letter/generate/route.ts`、`lib/cover-letter/generate.ts` |
| 看板內推薦信分頁 | `app/board/[applicationId]/_components/CoverLetterTab.tsx`、`ResumeUrlInput.tsx` |
| Landing 試玩版（免登入） | `app/_components/CoverLetterTryIt.tsx`、`app/api/cover-letter/try/route.ts` |

## 🎤 面試準備 + 復盤（V2）
| 要做的事 | 檔案 |
|---------|------|
| AI 出題（含歷史題庫加權） | `app/board/[applicationId]/_components/AiQuestionsEvolved.tsx`、`app/api/applications/[id]/ai-questions/route.ts`（+ `model-answer/`、`review/`） |
| 面試復盤（錄音上傳 / 手動填寫） | `_components/ReviewTab.tsx`、`ReviewForm.tsx`、`app/api/applications/[id]/review/*`（upload/transcribe/analyze/manual） |
| 復盤邏輯（Whisper 轉文字 + AI 分析） | `lib/review/transcribe.ts`、`lib/review/analyze.ts` |
| 面試紀錄 | `app/api/applications/[id]/interviews/route.ts` |

## 🏠 Dashboard — `/dashboard`
| 要做的事 | 檔案 |
|---------|------|
| 主頁（問候、Stats、待處理、動態、推薦摘要） | `app/dashboard/page.tsx`、`app/dashboard/_components/DashboardHome.tsx` |

## 👤 個人檔案 — `/profile`
| 要做的事 | 檔案 |
|---------|------|
| 個人檔案頁 + 工作經歷 | `app/profile/page.tsx`、`_components/ExperienceList.tsx`、`ExperienceForm.tsx`、`ExperienceCard.tsx` |
| 經歷 CRUD API | `app/api/profile/experiences/route.ts`、`[id]/route.ts` |

## 🤖 爬蟲 + 每日推薦 Email（背景工作）
| 要做的事 | 檔案 |
|---------|------|
| 104 爬蟲（Railway 跑） | `worker/crawler/run.py`、`lib/crawler/crawl.ts`、`api.ts`、`selectors.ts` |
| 每日 cron（match + 寄信，Vercel 觸發） | `app/api/cron/daily/route.ts` |
| 配對 / 寄信 / 評估 worker | `worker/match/run.ts`、`worker/email/run.ts`、`worker/eval/run.ts` |
| 寄信邏輯 | `lib/email/send.ts` |
| Email 點擊追蹤 | `app/api/track/click/route.ts` |

## 🧩 全站共用
| 用途 | 檔案 |
|------|------|
| 版型外殼 + 側邊欄 | `app/_components/AppShell.tsx`、`Sidebar.tsx`、`app/layout.tsx` |
| Prisma client（lazy proxy） | `lib/db/client.ts` |
| Supabase server client | `lib/supabase/server.ts` |
| DB schema | `prisma/schema.prisma` |
| 全域樣式 + 動畫 keyframe | `app/globals.css` |
