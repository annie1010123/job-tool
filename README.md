# JobPilot — 反向求職推薦系統

> 每天早上自動爬取 104 人力銀行職缺、雙 embedding 向量排名、寄送個人化每日摘要 Email

**Demo URL**: *(部署後填入)*
**Demo Video**: *(錄製後填入)*

---

## 這個專案做什麼

多數求職網站是「你去找職缺」。JobPilot 反過來：你上傳履歷、輸入求職意圖，系統每天主動幫你從 104 人力銀行的新職缺裡找出最符合的，寄到你的信箱。

**使用者流程**：
1. 上傳 PDF 履歷 → LLM 結構化解析
2. 輸入求職意圖（自由文字）→ Groq llama-3.1-8b 展開成 8–12 個搜尋關鍵字
3. 每天早上 8:00，系統自動：
   - 爬取 104 當日新職缺（含薪資、地區、徵才積極度、回覆天數、應徵人數）
   - 雙 embedding 排名 + recency / competition boost
   - Groq 生成推薦理由
   - 寄出 Email 摘要，含 click tracking

---

## 架構

```
┌─────────────────────────────────────────────────────┐
│                    User Browser                     │
└──────────────────────┬──────────────────────────────┘
                       │ NextAuth magic link
┌──────────────────────▼──────────────────────────────┐
│              Next.js 16 App Router                  │
│  /onboarding/resume  →  PDF upload → Supabase       │
│  /onboarding/intent  →  Groq keyword expand         │
│  /dashboard          →  today's recommendations     │
│  /api/cron/daily     →  Vercel Cron (00:00 UTC)     │
│  /api/track/click    →  email click tracking        │
└──────┬───────────────┬──────────────────────────────┘
       │               │
       ▼               ▼
┌─────────┐    ┌──────────────────────────────────────┐
│ Resend  │    │   PostgreSQL (Supabase) + pgvector   │
│  Email  │    │                                      │
└─────────┘    │  Jd / JdEmbedding (768-dim)         │
               │  Resume / ResumeEmbedding            │
               │  JobIntent / IntentEmbedding         │
               │  Recommendation (reasoning, skills)  │
               │  EmailLog (trackingToken, clickedAt) │
               └──────────────────────────────────────┘

Daily Cron Pipeline:
  Playwright crawler → Gemini embedding-001 → pgvector cosine → Groq reason → Resend
```

---

## Tech Decisions

### 為什麼用雙 Embedding？

履歷和求職意圖代表不同維度的需求：
- **履歷 embedding**：你「實際有」的技能
- **求職意圖 embedding**：你「想要做」的事

只用履歷排名，系統會推薦跟你過去技能相似的職缺（不一定是你想轉換的方向）。加入求職意圖後，weight 設計偏向意圖，讓系統能支援「轉職」場景：

```
final_score = 0.2 × cosine(resume, jd) + 0.8 × cosine(intent, jd)
            × recency_boost × competition_boost
```

### 為什麼用 Groq（不用 OpenAI）？

llama-3.1-8b-instant 在關鍵字展開和推薦理由這兩個任務上 latency 極低（~200ms），且免費層夠用。GPT-4o 對這類 structured output 任務是 overkill。

### 為什麼用 pgvector（不用 Pinecone）？

所有資料（JD、embedding、recommendation）都在同一個 PostgreSQL instance，CROSS JOIN 一次 query 就能完成全部排名，不需要跨服務呼叫。502 筆 JD 的情況下 query < 50ms。

### Prisma + Supabase 踩坑

Supabase 預設連線走 PgBouncer Transaction Mode（port 6543），與 Prisma driver adapter 不相容。解法：`DIRECT_URL` 指向 port 5432 直連。

tsx ESM import hoisting 問題：dotenv.config() 在 import 後才執行，導致模組層級的 SDK 初始化拿不到 env。解法：把 GoogleGenAI / Resend / PrismaClient 的初始化全部移進 function 內部，PrismaClient 用 Lazy Proxy 包裝。

---

## Evaluation

**設定**：
- 職缺總數：502 筆（全部有 embedding）
- Gold set：標題含 PM / 專案管理相關關鍵字的職缺（98 筆，佔 19.5%）
- 使用者求職意圖：「專案管理實習生」

| 方法 | P@5 | P@10 |
|------|-----|------|
| Keyword Baseline | 100% | 100% |
| Resume-only Embedding | 20% | 20% |
| **Full System (0.2 resume + 0.8 intent)** | **80%** | **90%** |

**關鍵發現**：
- Resume-only P@5 只有 20%（履歷裡有行銷經歷，單純靠履歷會推薦行銷類職缺）
- 加入求職意圖 embedding 後 P@5 **+60pp**，P@10 **+70pp**
- Keyword Baseline 存在循環性（gold set 以關鍵字定義，與 baseline 相同），真正有意義的對照是 resume-only vs full system

---

## Scoring 設計

```
final_score = (0.2 × resume_cos + 0.8 × intent_cos)
            × recency_boost × competition_boost

recency_boost     = 1.15  if posted today or yesterday, else 1.0
competition_boost = 1.10  if applicant_count < 5,       else 1.0
```

Diversity guardrail：同一公司最多出現 2 個職缺（從 top-20 candidates 中篩選至 top-10）。

---

## What I Learned

1. **Embedding weight 的直覺**：0.2/0.8 的設計不是隨機的。Resume embedding 提供「能力相容性」，intent embedding 提供「方向性」。對轉職者來說，方向比背景更重要，所以 intent weight 要高。

2. **Playwright 爬蟲的節奏**：104 有 rate limiting，請求間插 jitter（8s + random）才能穩定跑幾百筆。Headless Chromium 比直接 fetch 更可靠，部分頁面需要 JS 執行才能拿到薪資資訊。

3. **pgvector CROSS JOIN 的效率**：把 user embedding 用 CROSS JOIN 帶入，讓資料庫一次完成全部的 cosine similarity 計算，避免 application layer 的 N+1 問題。

4. **tsx ESM module hoisting**：這個問題在官方文件裡沒有特別說明，Lazy Proxy 模式是讓 Prisma 在 worker script 環境下正常工作的關鍵。

5. **Evaluation 的循環性陷阱**：用關鍵字定義 gold set，再拿關鍵字 baseline 比較，得到的 100% 沒有意義。真正的對照要用不同維度的 oracle（例如人工標注，或以不同信號定義相關性）。

---

## 本地開發

```bash
# 1. 安裝依賴
pnpm install

# 2. 環境變數
cp .env.example .env.local
# 填入各 API key（見下方環境變數表）

# 3. DB migrate
pnpm prisma migrate dev

# 4. 啟動 dev server
pnpm dev

# 5. 爬取職缺（Python 爬蟲，Railway 上以 `python run.py` 排程執行）
cd worker/crawler && pip install -r requirements.txt && python run.py

# 6. match + 寄信：爬蟲完成後自動觸發 Vercel cron /api/cron/daily
#    本地手動觸發：curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/daily
```

---

## 環境變數

| 變數 | 說明 |
|------|------|
| `DIRECT_URL` | Supabase PostgreSQL 直連（port 5432） |
| `DATABASE_URL` | PgBouncer URL（prisma migrate 用） |
| `GEMINI_API_KEY` | Google Gemini embedding-001（768-dim） |
| `GROQ_API_KEY` | Groq llama-3.1-8b-instant |
| `RESEND_API_KEY` | Resend Email API |
| `AUTH_SECRET` | NextAuth secret |
| `AUTH_RESEND_KEY` | NextAuth magic link sender |
| `CRON_SECRET` | Vercel Cron 授權 token |
| `NEXTAUTH_URL` | 部署後的 base URL |

---

## 專案結構

```
app/
  api/cron/daily/     # Vercel Cron 入口（每日 00:00 UTC）
  api/track/click/    # Email click tracking redirect
  dashboard/          # 今日推薦列表
  onboarding/         # 履歷上傳 + 求職意圖輸入
lib/
  match/score.ts      # 雙 embedding cosine + boost 排名
  match/reason.ts     # Groq 推薦理由批次生成
  match/preview.ts    # Onboarding 完成後即時 preview email
  email/send.ts       # Resend 寄送每日推薦
  email/template.tsx  # React Email DailyDigest 模板
worker/
  crawler/run.py      # 104 爬蟲（curl_cffi 反偵測，Railway 排程；含 embedding + 觸發 cron）
```

> 完整功能 → 檔案對照見 `docs/FILE-MAP.md`
