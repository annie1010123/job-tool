# 投遞追蹤重設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重設計 /board 投遞追蹤頁為 CRM 漏斗式清單 + 雙模式切換，強化職缺詳細頁狀態管理與 AI 面試準備互動。

**Architecture:**
- Phase 1（Tasks 1–3）：DB schema + API + 封存機制
- Phase 2（Tasks 4–6）：主頁清單/看板重構
- Phase 3（Tasks 7–8）：詳細頁 Header 改版
- Phase 4（Tasks 9–10）：AI 面試準備 Tab 全面強化

**Tech Stack:** Next.js 15 App Router, TypeScript, Prisma (PostgreSQL / Supabase), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-06-10-board-redesign.md`

---

## File Map

| 動作 | 路徑 | 說明 |
|------|------|------|
| Modify | `prisma/schema.prisma` | 加封存欄位 |
| Modify | `app/api/applications/route.ts` | GET 預設過濾封存 |
| Modify | `app/api/applications/[id]/route.ts` | PATCH 支援封存 |
| Modify | `app/board/page.tsx` | 傳入 archivedApplications |
| Modify | `app/board/_components/KanbanBoard.tsx` | 加 mode toggle、整合新元件 |
| Create | `app/board/_components/BoardFunnel.tsx` | 漏斗統計列 |
| Create | `app/board/_components/BoardListView.tsx` | 清單主體 |
| Create | `app/board/_components/ArchiveSection.tsx` | 封存區 |
| Modify | `app/board/_components/ApplicationDetail.tsx` | 狀態下拉、toast、封存按鈕 |
| Modify | `app/board/[applicationId]/page.tsx` | defaultTab、傳 JD props |
| Modify | `app/board/[applicationId]/_components/ApplicationTabs.tsx` | defaultTab prop、傳 onGoToReview |
| Modify | `app/board/[applicationId]/_components/AiQuestionsEvolved.tsx` | 全面改版 |

---

## Task 1: DB Schema 更新

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 在 Application model 加入封存欄位**

在 `prisma/schema.prisma` 的 Application model，`updatedAt` 之前加入：

```prisma
  isArchived    Boolean   @default(false)
  archiveReason String?
  archivedAt    DateTime?
```

- [ ] **Step 2: 推送到 DB**

```bash
cd "/Users/annie24578/Desktop/vibe coding/job-tool"
pnpm prisma db push
pnpm prisma generate
```

Expected: `✓ Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add isArchived/archiveReason/archivedAt to Application"
```

---

## Task 2: STATUSES 常數重構

**Files:**
- Modify: `app/board/_components/KanbanBoard.tsx`

移除 `second_round`，`result` 拆成 `offer` + `rejected`，另建 `KANBAN_COLUMNS` 供看板使用。

- [ ] **Step 1: 更新 KanbanBoard.tsx 頂部的 STATUSES 與 KANBAN_COLUMNS**

把現有的 `STATUSES` 替換成以下兩個常數（保留 export）：

```ts
// 詳細頁狀態下拉用（5 個選項）
export const STATUSES = [
  { value: "not_applied",  label: "未投遞",         dot: "bg-zinc-400" },
  { value: "applied",      label: "投遞中",         dot: "bg-blue-500" },
  { value: "interviewing", label: "面試中",         dot: "bg-amber-500" },
  { value: "offer",        label: "錄取 🎉",        dot: "bg-green-500" },
  { value: "rejected",     label: "感謝信（被刷）",  dot: "bg-red-400" },
] as const;

export type AppStatus = (typeof STATUSES)[number]["value"];

// 看板 4 欄（結果欄含 offer + rejected）
export const KANBAN_COLUMNS = [
  { value: "not_applied",  label: "未投遞", dot: "bg-zinc-400", colBg: "bg-zinc-50",      statuses: ["not_applied"] as string[] },
  { value: "applied",      label: "投遞中", dot: "bg-blue-500", colBg: "bg-blue-50/40",   statuses: ["applied"] as string[] },
  { value: "interviewing", label: "面試中", dot: "bg-amber-500",colBg: "bg-amber-50/40",  statuses: ["interviewing"] as string[] },
  { value: "result",       label: "結果",   dot: "bg-green-500",colBg: "bg-green-50/40",  statuses: ["offer", "rejected"] as string[] },
] as const;
```

同時刪除舊有的 `type Status = ...` 行。

- [ ] **Step 2: Commit**

```bash
git add app/board/_components/KanbanBoard.tsx
git commit -m "refactor: STATUSES → offer/rejected split, add KANBAN_COLUMNS"
```

---

## Task 3: API 更新 + page.tsx 傳入封存資料

**Files:**
- Modify: `app/api/applications/[id]/route.ts`
- Modify: `app/api/applications/route.ts`
- Modify: `app/board/page.tsx`

- [ ] **Step 1: PATCH API 加入封存欄位支援**

在 `app/api/applications/[id]/route.ts` 的 `data` 物件中加入：

```ts
...(body.isArchived    !== undefined && { isArchived: body.isArchived }),
...(body.archiveReason !== undefined && { archiveReason: body.archiveReason ?? null }),
...(body.archivedAt    !== undefined && { archivedAt: body.archivedAt ? new Date(body.archivedAt) : null }),
```

- [ ] **Step 2: GET API 預設過濾封存**

在 `app/api/applications/route.ts` 的 `findMany` where 加入：

```ts
where: { userId: session.user.id, isArchived: false },
```

- [ ] **Step 3: board/page.tsx 新增封存職缺查詢**

在 `applications` 查詢的 where 加入 `isArchived: false`，並在其後新增：

```ts
const archivedApplications = await prisma.application.findMany({
  where: { userId: session.user.id, isArchived: true },
  include: {
    jd: { select: { id: true, title: true, companyName: true, externalUrl: true, postedAt: true } },
    interviewRecords: true,
  },
  orderBy: { archivedAt: "desc" },
});
```

把 `<KanbanBoard>` 改成：

```tsx
<KanbanBoard
  initialApplications={JSON.parse(JSON.stringify(applications))}
  initialArchivedApplications={JSON.parse(JSON.stringify(archivedApplications))}
/>
```

- [ ] **Step 4: Commit**

```bash
git add app/api/applications/[id]/route.ts app/api/applications/route.ts app/board/page.tsx
git commit -m "feat: API + board page support for archive data"
```

---

## Task 4: BoardFunnel + BoardListView 元件

**Files:**
- Create: `app/board/_components/BoardFunnel.tsx`
- Create: `app/board/_components/BoardListView.tsx`

- [ ] **Step 1: 建立 BoardFunnel.tsx**

```tsx
"use client";

interface Props {
  applications: { status: string }[];
  archivedCount: number;
}

export default function BoardFunnel({ applications, archivedCount }: Props) {
  const applied      = applications.filter(a => ["applied","interviewing","offer","rejected"].includes(a.status)).length;
  const interviewing = applications.filter(a => ["interviewing","offer","rejected"].includes(a.status)).length;
  const offers       = applications.filter(a => a.status === "offer").length;

  const toInterview = applied > 0 ? Math.round((interviewing / applied) * 100) : null;
  const toOffer     = interviewing > 0 ? Math.round((offers / interviewing) * 100) : null;

  return (
    <div className="flex items-center bg-white border border-zinc-100 rounded-2xl px-6 py-4 shadow-sm mb-5">
      <FItem num={applied}      label="投遞中" />
      <Arrow />
      <FItem num={interviewing} label="面試中" rate={toInterview} color="text-amber-500" />
      <Arrow />
      <FItem num={offers}       label="Offer"  rate={toOffer}     color="text-green-500" />
      {archivedCount > 0 && (
        <div className="flex items-center gap-2 pl-5 ml-3 border-l border-zinc-100">
          <span className="text-lg font-semibold text-zinc-400">{archivedCount}</span>
          <span className="text-xs text-zinc-400">已封存</span>
        </div>
      )}
    </div>
  );
}

function FItem({ num, label, rate, color = "text-zinc-900" }: { num: number; label: string; rate?: number | null; color?: string }) {
  return (
    <div className="text-center flex-1">
      <div className={`text-2xl font-bold leading-none ${color}`}>{num}</div>
      <div className="text-xs text-zinc-500 mt-1">{label}</div>
      {rate != null && <div className="text-xs text-zinc-400 mt-0.5">轉換率 {rate}%</div>}
    </div>
  );
}

function Arrow() {
  return <span className="text-zinc-200 text-xl mx-2 flex-shrink-0">→</span>;
}
```

- [ ] **Step 2: 建立 BoardListView.tsx**

```tsx
"use client";
import { useRouter } from "next/navigation";

interface Jd { id: string; title: string; companyName: string; }
export interface ListApp {
  id: string; status: string; companyType: string | null;
  createdAt: string; scheduledAt: string | null; appliedAt: string | null;
  jd: Jd; interviewRecords: unknown[];
}

const STATUS_LABEL: Record<string, string> = {
  not_applied: "未投遞", applied: "投遞中", interviewing: "面試中",
  offer: "錄取 🎉", rejected: "感謝信",
};
const STATUS_BADGE: Record<string, string> = {
  not_applied: "bg-zinc-100 text-zinc-500",
  applied:     "bg-blue-50 text-blue-700",
  interviewing:"bg-amber-50 text-amber-700",
  offer:       "bg-green-50 text-green-700",
  rejected:    "bg-red-50 text-red-600",
};
const GROUP_ORDER = ["interviewing", "applied", "not_applied", "offer", "rejected"];
const GHOST_DAYS = 14;

function daysSince(d: string | null) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}
function daysUntil(d: string | null): string | null {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === 2) return "後天";
  if (diff < 0) return `${Math.abs(diff)} 天前`;
  return `${diff} 天後`;
}

interface Props {
  apps: ListApp[];
  onArchive: (appId: string, reason: string) => void;
}

export default function BoardListView({ apps, onArchive }: Props) {
  const router = useRouter();
  const grouped = GROUP_ORDER
    .map(s => ({ status: s, items: apps.filter(a => a.status === s) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-6">
      {grouped.map(({ status, items }) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              {STATUS_LABEL[status]}
            </span>
            <span className="text-xs text-zinc-300 bg-zinc-100 rounded-full px-2">{items.length}</span>
          </div>
          <div className="grid grid-cols-[1fr_1fr_130px_80px_140px] text-xs text-zinc-400 font-medium uppercase tracking-wide px-4 pb-1.5">
            <span>公司</span><span>職缺</span><span>狀態</span><span>天數</span><span />
          </div>
          <div className="space-y-1.5">
            {items.map(app => {
              const ghosted = status === "applied" && (daysSince(app.appliedAt ?? app.createdAt) ?? 0) >= GHOST_DAYS;
              const appliedDays = daysSince(app.appliedAt ?? app.createdAt);
              const interviewLabel = status === "interviewing" ? daysUntil(app.scheduledAt) : null;

              return (
                <div
                  key={app.id}
                  onClick={() => router.push(`/board/${app.id}`)}
                  className={`grid grid-cols-[1fr_1fr_130px_80px_140px] items-center bg-white border rounded-xl px-4 py-3 cursor-pointer hover:shadow-sm transition-all ${
                    ghosted
                      ? "border-l-[3px] border-l-orange-400 border-y-zinc-100 border-r-zinc-100"
                      : "border-zinc-100 hover:border-zinc-200"
                  }`}
                >
                  <span className="text-sm font-semibold text-zinc-900 truncate">{app.jd.companyName}</span>
                  <span className="text-sm text-zinc-600 truncate">{app.jd.title}</span>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${ghosted ? "bg-orange-50 text-orange-700" : STATUS_BADGE[status]}`}>
                      {ghosted ? "⚠ 久沒回音" : STATUS_LABEL[status]}
                    </span>
                  </div>
                  <span className={`text-xs ${ghosted ? "text-orange-500 font-semibold" : "text-zinc-500"}`}>
                    {status === "applied" && appliedDays != null ? `${appliedDays} 天` : ""}
                    {status === "interviewing" && interviewLabel ? interviewLabel : ""}
                  </span>
                  <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                    {status === "not_applied" && (
                      <button onClick={() => router.push(`/board/${app.id}`)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                        寫推薦信
                      </button>
                    )}
                    {status === "interviewing" && (
                      <button onClick={() => router.push(`/board/${app.id}`)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-violet-700">
                        準備面試
                      </button>
                    )}
                    {(ghosted || status === "offer" || status === "rejected") && (
                      <button onClick={() => onArchive(app.id, ghosted ? "ghosted" : status === "rejected" ? "rejected" : "withdrew")}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700">
                        封存
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/board/_components/BoardFunnel.tsx app/board/_components/BoardListView.tsx
git commit -m "feat: BoardFunnel and BoardListView components"
```

---

## Task 5: ArchiveSection 元件

**Files:**
- Create: `app/board/_components/ArchiveSection.tsx`

- [ ] **Step 1: 建立 ArchiveSection.tsx**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface ArchivedApp {
  id: string; archiveReason: string | null; archivedAt: string | null;
  jd: { title: string; companyName: string };
}

const REASON: Record<string, { label: string; cls: string }> = {
  ghosted:  { label: "久沒回音",   cls: "bg-zinc-100 text-zinc-500" },
  rejected: { label: "收到感謝信", cls: "bg-red-50 text-red-600" },
  withdrew: { label: "主動放棄",   cls: "bg-blue-50 text-blue-600" },
};

interface Props { apps: ArchivedApp[]; onRestore: (id: string) => void; }

export default function ArchiveSection({ apps, onRestore }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (apps.length === 0) return null;

  return (
    <div className="mt-8">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors px-1 py-2 w-full text-left">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .2s" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
        封存區（{apps.length} 筆）
        <span className="text-xs text-zinc-300 ml-1">已結束或久沒回音</span>
      </button>

      {open && (
        <div className="border border-zinc-100 rounded-xl overflow-hidden bg-white mt-1">
          <div className="grid grid-cols-[1fr_1fr_120px_90px_70px] text-xs text-zinc-400 font-medium uppercase tracking-wide px-4 py-2 bg-zinc-50 border-b border-zinc-100">
            <span>公司</span><span>職缺</span><span>封存原因</span><span>日期</span><span />
          </div>
          {apps.map(app => {
            const r = REASON[app.archiveReason ?? "ghosted"] ?? REASON.ghosted;
            const date = app.archivedAt
              ? new Date(app.archivedAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })
              : "—";
            return (
              <div key={app.id}
                onClick={() => router.push(`/board/${app.id}`)}
                className="grid grid-cols-[1fr_1fr_120px_90px_70px] items-center px-4 py-3 border-b border-zinc-50 last:border-0 opacity-60 hover:opacity-100 hover:bg-zinc-50 transition-all cursor-pointer">
                <span className="text-sm font-medium text-zinc-700">{app.jd.companyName}</span>
                <span className="text-sm text-zinc-500">{app.jd.title}</span>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full w-fit ${r.cls}`}>{r.label}</span>
                <span className="text-xs text-zinc-400">{date}</span>
                <div onClick={e => e.stopPropagation()}>
                  <button onClick={() => onRestore(app.id)}
                    className="text-xs text-zinc-400 border border-zinc-200 rounded-md px-2 py-1 hover:text-zinc-700 hover:border-zinc-400 transition-colors">
                    復原
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/board/_components/ArchiveSection.tsx
git commit -m "feat: ArchiveSection component"
```

---

## Task 6: KanbanBoard 整合 + 看板更新

**Files:**
- Modify: `app/board/_components/KanbanBoard.tsx`

- [ ] **Step 1: 更新 KanbanBoard Props 介面**

```ts
interface ArchivedAppShell {
  id: string; archiveReason: string | null; archivedAt: string | null;
  jd: { id: string; title: string; companyName: string; externalUrl: string; postedAt: string | null };
  interviewRecords: unknown[];
}

// 在 export default function KanbanBoard 的 props 加入：
initialArchivedApplications: ArchivedAppShell[];
```

- [ ] **Step 2: 加入 viewMode state + 封存/復原 handlers**

```ts
const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
const [archived, setArchived] = useState<ArchivedAppShell[]>(initialArchivedApplications);

async function archiveApp(appId: string, reason: string) {
  const app = apps.find(a => a.id === appId);
  if (!app) return;
  setApps(prev => prev.filter(a => a.id !== appId));
  const now = new Date().toISOString();
  setArchived(prev => [{ ...app, archiveReason: reason, archivedAt: now }, ...prev]);
  await fetch(`/api/applications/${appId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isArchived: true, archiveReason: reason, archivedAt: now }),
  });
}

async function restoreApp(appId: string) {
  const app = archived.find(a => a.id === appId);
  if (!app) return;
  setArchived(prev => prev.filter(a => a.id !== appId));
  setApps(prev => [{ ...app, status: "applied" }, ...prev]);
  await fetch(`/api/applications/${appId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isArchived: false, archiveReason: null, archivedAt: null }),
  });
}
```

- [ ] **Step 3: 更新 Header 加入模式切換按鈕**

把現有的 `<div className="flex justify-end mb-4">` 區塊替換成：

```tsx
<div className="flex items-center justify-between mb-6">
  {/* 模式切換 */}
  <div className="flex bg-white border border-zinc-200 rounded-xl overflow-hidden">
    {(["list", "kanban"] as const).map(mode => (
      <button key={mode} onClick={() => setViewMode(mode)}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
          viewMode === mode ? "bg-zinc-900 text-white" : "text-zinc-500 hover:text-zinc-700"
        }`}>
        {mode === "list" ? "清單" : "看板"}
      </button>
    ))}
  </div>
  <button onClick={() => setShowAddModal(true)}
    className="text-sm bg-zinc-900 text-white rounded-lg px-4 py-2 hover:bg-zinc-700 transition-colors">
    + 新增職缺
  </button>
</div>
```

- [ ] **Step 4: 根據 viewMode 渲染不同主體**

在現有 kanban JSX 的外層包上條件：

```tsx
{apps.length === 0 && archived.length === 0 ? (
  <EmptyState onAdd={() => setShowAddModal(true)} />
) : (
  <>
    <BoardFunnel applications={apps} archivedCount={archived.length} />
    {viewMode === "list" ? (
      <BoardListView apps={apps} onArchive={archiveApp} />
    ) : (
      <KanbanColumns apps={apps} onArchive={archiveApp} onMoveStatus={moveStatus} onDelete={deleteApp} />
    )}
    <ArchiveSection apps={archived} onRestore={restoreApp} />
  </>
)}
```

將現有看板邏輯抽成內部元件 `KanbanColumns`（不需要獨立檔案，放在同一 .tsx 內即可）。

- [ ] **Step 5: KanbanColumns 使用 KANBAN_COLUMNS**

```ts
const columns = KANBAN_COLUMNS.map(col => ({
  ...col,
  cards: apps.filter(a => col.statuses.includes(a.status)),
}));
```

在面試中的卡片，`scheduledAt` 下方加輪次 badge：

```tsx
{app.status === "interviewing" && app.interviewRecords.length > 0 && (
  <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
    第 {app.interviewRecords.length} 輪
  </span>
)}
```

- [ ] **Step 6: 加入 imports（BoardFunnel, BoardListView, ArchiveSection）**

```ts
import BoardFunnel from "./BoardFunnel";
import BoardListView from "./BoardListView";
import ArchiveSection, { type ArchivedApp as ArchivedAppShell } from "./ArchiveSection";
```

- [ ] **Step 7: 手動測試主頁**

```bash
pnpm dev
```

開啟 http://localhost:3000/board，確認：
1. 預設清單模式，顯示漏斗統計
2. 切換看板模式正常
3. 14 天以上投遞中職缺顯示橘色警示 + 封存 CTA
4. 按封存後職缺移到封存區
5. 按復原後職缺回到清單

- [ ] **Step 8: Commit**

```bash
git add app/board/_components/KanbanBoard.tsx
git commit -m "feat: board dual-mode list/kanban, funnel, archive section integrated"
```

---

## Task 7: 詳細頁 Header — StatusDropdown + Toast + 封存

**Files:**
- Modify: `app/board/_components/ApplicationDetail.tsx`

這個元件現有大量 state 和 UI，只修改 Header 相關部分。

- [ ] **Step 1: 加入必要 state 和 ref**

在既有 state 宣告區新增：

```ts
const [statusOpen, setStatusOpen] = useState(false);
const [archiveOpen, setArchiveOpen] = useState(false);
const [toast, setToast] = useState<{ msg: string; prevStatus: string } | null>(null);
const statusRef   = useRef<HTMLDivElement>(null);
const archiveRef  = useRef<HTMLDivElement>(null);
const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
```

- [ ] **Step 2: 加入點擊外部關閉 dropdown 的 effect**

```ts
useEffect(() => {
  function handle(e: MouseEvent) {
    if (statusRef.current  && !statusRef.current.contains(e.target as Node))  setStatusOpen(false);
    if (archiveRef.current && !archiveRef.current.contains(e.target as Node)) setArchiveOpen(false);
  }
  document.addEventListener("mousedown", handle);
  return () => document.removeEventListener("mousedown", handle);
}, []);
```

- [ ] **Step 3: 更新 updateStatus — 加入 toast**

在現有 `updateStatus` 函式的 `setStatus(newStatus as Status)` 之後加入：

```ts
if (toastTimer.current) clearTimeout(toastTimer.current);
const label = STATUSES.find(s => s.value === newStatus)?.label ?? newStatus;
setToast({ msg: `狀態已更新為「${label}」`, prevStatus: prev });
toastTimer.current = setTimeout(() => setToast(null), 4000);
```

新增 undoStatus 函式：

```ts
async function undoStatus() {
  if (!toast) return;
  const prev = toast.prevStatus;
  setStatus(prev as Status);
  setToast(null);
  if (toastTimer.current) clearTimeout(toastTimer.current);
  await fetch(`/api/applications/${application.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: prev }),
  });
}
```

- [ ] **Step 4: 把 Header 的狀態 pills 替換成 StatusDropdown**

找到 `{STATUSES.map((s) => (` 的 pills 區塊，**整段替換**為：

```tsx
{/* 狀態下拉 */}
<div className="relative" ref={statusRef}>
  <button onClick={() => setStatusOpen(o => !o)}
    className={`inline-flex items-center gap-2 text-sm font-semibold px-3.5 py-1.5 rounded-full border-[1.5px] transition-colors ${
      status === "offer"    ? "bg-green-50 border-green-300 text-green-800" :
      status === "rejected" ? "bg-red-50 border-red-300 text-red-700" :
      status === "interviewing" ? "bg-amber-50 border-amber-300 text-amber-800" :
      status === "applied"  ? "bg-blue-50 border-blue-300 text-blue-800" :
      "bg-zinc-100 border-zinc-200 text-zinc-700"
    }`}>
    <span className={`w-2 h-2 rounded-full ${STATUSES.find(s => s.value === status)?.dot ?? "bg-zinc-400"}`} />
    {STATUSES.find(s => s.value === status)?.label ?? status}
    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
  {statusOpen && (
    <div className="absolute top-full left-0 mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 min-w-[190px] overflow-hidden">
      {STATUSES.map(s => (
        <button key={s.value}
          onClick={() => { updateStatus(s.value); setStatusOpen(false); }}
          className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-left hover:bg-zinc-50 transition-colors ${
            status === s.value ? "font-semibold text-zinc-900" : "text-zinc-600"
          }`}>
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
          {s.label}
          {status === s.value && <span className="ml-auto text-zinc-400 text-xs">✓</span>}
        </button>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 5: 加入右上角封存按鈕**

找到 header card 右上角區域，加入：

```tsx
<div className="relative" ref={archiveRef}>
  <button onClick={() => setArchiveOpen(o => !o)}
    className="flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-200 rounded-lg px-3 py-1.5 hover:border-zinc-400 hover:text-zinc-600 transition-colors">
    <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="21 8 21 21 3 21 3 8"/>
      <rect x="1" y="3" width="22" height="5"/>
      <line x1="10" y1="12" x2="14" y2="12"/>
    </svg>
    封存
  </button>
  {archiveOpen && (
    <div className="absolute right-0 top-full mt-1.5 bg-white border border-zinc-200 rounded-xl shadow-lg z-20 min-w-[160px] overflow-hidden">
      <div className="px-3 pt-2 pb-1 text-xs text-zinc-400 border-b border-zinc-100">選擇封存原因</div>
      {[
        { value: "ghosted",  label: "久沒回音" },
        { value: "rejected", label: "收到感謝信" },
        { value: "withdrew", label: "主動放棄" },
      ].map(r => (
        <button key={r.value}
          onClick={async () => {
            setArchiveOpen(false);
            await fetch(`/api/applications/${application.id}`, {
              method: "PATCH", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ isArchived: true, archiveReason: r.value, archivedAt: new Date().toISOString() }),
            });
            router.push("/board");
          }}
          className="w-full text-left px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
          {r.label}
        </button>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 6: 加入 Toast UI**

在元件 JSX 最底部（`</>` 之前）加入：

```tsx
{toast && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-zinc-900 text-white text-sm rounded-xl px-4 py-2.5 shadow-xl z-50 whitespace-nowrap">
    {toast.msg}
    <button onClick={undoStatus} className="text-violet-400 font-semibold hover:text-violet-300 transition-colors">
      復原
    </button>
  </div>
)}
```

- [ ] **Step 7: Commit**

```bash
git add app/board/_components/ApplicationDetail.tsx
git commit -m "feat: detail header - status dropdown, toast undo, archive button"
```

---

## Task 8: Context-aware 預設 Tab

**Files:**
- Modify: `app/board/[applicationId]/_components/ApplicationTabs.tsx`
- Modify: `app/board/[applicationId]/page.tsx`

- [ ] **Step 1: ApplicationTabs 接收 defaultTab + onGoToReview**

```ts
export default function ApplicationTabs({
  applicationId, aiQuestions, reviews, children,
  defaultTab = "ai",
  onGoToReview,
}: {
  applicationId: string;
  aiQuestions: AiQuestion[];
  reviews: InterviewReview[];
  children: React.ReactNode;
  defaultTab?: TabKey;
  onGoToReview?: () => void;  // 讓 AiQuestionsEvolved 可以切到復盤 tab
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);

  const goToReview = () => setActiveTab("review");
```

把 `goToReview` 傳給 `AiQuestionsEvolved`（需先更新該元件的 props，見 Task 9）：

```tsx
{activeTab === "ai" && (
  <AiQuestionsEvolved
    applicationId={applicationId}
    initialQuestions={aiQuestions}
    onGoToReview={goToReview}
  />
)}
```

- [ ] **Step 2: page.tsx 根據狀態決定 defaultTab**

在 `page.tsx` 加入：

```ts
function getDefaultTab(status: string): "ai" | "cover-letter" | "review" | "info" {
  if (status === "not_applied") return "cover-letter";
  if (status === "offer" || status === "rejected") return "review";
  return "ai";
}
```

```tsx
<ApplicationTabs
  applicationId={applicationId}
  aiQuestions={serialized.aiQuestions ?? []}
  reviews={serialized.interviewReviews ?? []}
  defaultTab={getDefaultTab(app.status)}
  // jdDescription 在 Task 9 補入
>
```

- [ ] **Step 3: Commit**

```bash
git add app/board/[applicationId]/_components/ApplicationTabs.tsx app/board/[applicationId]/page.tsx
git commit -m "feat: context-aware default tab, onGoToReview callback"
```

---

## Task 9: AI 準備 Tab — JD 折疊、答案草稿、進度、隱藏、面試有問到

**Files:**
- Modify: `app/board/[applicationId]/_components/AiQuestionsEvolved.tsx`
- Modify: `app/board/[applicationId]/page.tsx`
- Modify: `app/board/[applicationId]/_components/ApplicationTabs.tsx`

- [ ] **Step 1: 更新 AiQuestion 型別 + normalizeQuestion**

在 `AiQuestionsEvolved.tsx` 頂部更新 interface：

```ts
interface AiQuestion {
  question: string;
  type: "行為題" | "技術題" | "動機題" | "情境題";
  round: number;
  prepared: boolean;
  answerDraft: string;
  hidden: boolean;
  askedInInterview: boolean;
  fromHistory: boolean;
  relatedCompany: string | null;
  previousPerformance: string | null;
  improvementTip: string | null;
}

function normalize(q: Partial<AiQuestion>): AiQuestion {
  return {
    question: q.question ?? "", type: q.type ?? "行為題",
    round: q.round ?? 1, prepared: q.prepared ?? false,
    answerDraft: q.answerDraft ?? "", hidden: q.hidden ?? false,
    askedInInterview: q.askedInInterview ?? false,
    fromHistory: q.fromHistory ?? false,
    relatedCompany: q.relatedCompany ?? null,
    previousPerformance: q.previousPerformance ?? null,
    improvementTip: q.improvementTip ?? null,
  };
}
```

- [ ] **Step 2: 更新 Props + state**

```ts
interface Props {
  applicationId: string;
  initialQuestions: Partial<AiQuestion>[];
  jdDescription?: string | null;
  onGoToReview?: () => void;
}

export default function AiQuestionsEvolved({ applicationId, initialQuestions, jdDescription, onGoToReview }: Props) {
  const [questions, setQuestions] = useState<AiQuestion[]>(initialQuestions.map(normalize));
  const [currentRound, setCurrentRound] = useState(1);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
```

- [ ] **Step 3: 加入 updateQuestion helper**

```ts
async function updateQuestion(idx: number, patch: Partial<AiQuestion>) {
  const updated = questions.map((q, i) => i === idx ? { ...q, ...patch } : q);
  setQuestions(updated);
  await fetch(`/api/applications/${applicationId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aiQuestions: updated }),
  });
}
```

- [ ] **Step 4: 加入答題提示常數**

```ts
const ANSWER_HINTS: Record<string, string> = {
  "行為題": "用 STAR 結構（情境→任務→行動→結果）。聚焦你做了什麼，而非整個團隊。選一個有具體結果的例子。",
  "技術題": "先說你的思路，再解釋具體做法。若不確定，誠實說明你會如何查找或請教。",
  "動機題": "連結你的個人故事或價值觀，展示你對這家公司是真的有興趣，不只是廣投。",
  "情境題": "直接進入情境，說明決策邏輯和框架。展示你怎麼思考，而非只說「我會先研究」。",
};
```

- [ ] **Step 5: 渲染 JD 折疊 + 工具列 + 進度列**

把現有 return JSX 的 AI header 區段（`<div className="flex items-start justify-between mb-4">` 前）加入：

```tsx
{/* JD 折疊 */}
{jdDescription && (
  <details className="mb-4 border border-zinc-100 rounded-xl overflow-hidden group">
    <summary className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 cursor-pointer select-none text-sm font-medium text-zinc-600">
      <span>職缺描述</span>
      <span className="text-xs text-zinc-400">展開 / 收起</span>
    </summary>
    <div className="px-4 py-3 text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
      {jdDescription.length > 800 ? jdDescription.slice(0, 800) + "…" : jdDescription}
    </div>
  </details>
)}

{/* 輪次工具列 */}
<div className="flex items-center gap-2 mb-3 flex-wrap">
  <div className="flex bg-zinc-100 rounded-lg p-0.5">
    {[...new Set(questions.map(q => q.round))].sort().map(r => (
      <button key={r} onClick={() => setCurrentRound(r)}
        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${currentRound === r ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
        第 {r} 輪
      </button>
    ))}
    <button onClick={() => { const max = Math.max(...questions.map(q => q.round), 0); setCurrentRound(max + 1); }}
      className="text-xs font-medium px-3 py-1.5 text-zinc-400 hover:text-zinc-600">
      ＋ 輪次
    </button>
  </div>
  <div className="flex-1" />
  <button onClick={handleAddManual}
    className="text-xs font-medium px-3 py-1.5 border border-zinc-200 rounded-lg text-zinc-600 hover:border-zinc-400 transition-colors">
    ＋ 手動加題
  </button>
</div>

{/* 進度列 */}
{(() => {
  const visible = questions.filter(q => q.round === currentRound && !q.hidden);
  const done = visible.filter(q => q.prepared).length;
  return visible.length > 0 && (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className="h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${(done / visible.length) * 100}%` }} />
      </div>
      <span className="text-xs text-zinc-400 whitespace-nowrap">{done} / {visible.length} 已準備</span>
    </div>
  );
})()}
```

- [ ] **Step 6: 更新題目卡片 — 加入 actions + 展開區**

把現有的每個題目 div 重構為可展開卡片（保留現有 checkbox 邏輯）：

每個題目的 row 最右邊加 actions（收起狀態下可見）：

```tsx
{/* 面試有問到 + 隱藏 */}
<div className="flex items-center gap-1.5 ml-auto flex-shrink-0" onClick={e => e.stopPropagation()}>
  <button onClick={() => updateQuestion(idx, { askedInInterview: !q.askedInInterview })}
    className={`text-xs px-2 py-1 rounded-md border transition-colors ${
      q.askedInInterview
        ? "bg-green-50 border-green-200 text-green-700 font-medium"
        : "bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300"
    }`}>
    {q.askedInInterview ? "✓ 問到了" : "面試有問到"}
  </button>
  <button onClick={() => updateQuestion(idx, { hidden: true })}
    className="text-xs text-zinc-300 hover:text-zinc-500 px-1.5 py-1 transition-colors">
    隱藏
  </button>
</div>
```

展開區（`expandedIdx === idx` 時顯示）：

```tsx
{expandedIdx === idx && (
  <div className="border-t border-zinc-100 px-4 pb-4 pt-3 bg-zinc-50/50">
    {/* 面試有問到 → 去復盤 */}
    {q.askedInInterview && (
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-3">
        <span className="text-xs text-green-700 flex-1">這題面試有問到！去復盤記錄你的回答。</span>
        <button onClick={onGoToReview}
          className="text-xs font-semibold text-green-700 border border-green-300 rounded-md px-2.5 py-1 hover:bg-green-100">
          去復盤 →
        </button>
      </div>
    )}
    {/* 歷史改進提示 */}
    {q.fromHistory && q.improvementTip && (
      <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5 mb-3 text-xs text-violet-800 leading-relaxed">
        <div className="font-semibold mb-1">📝 {q.relatedCompany ? `上次在 ${q.relatedCompany} 面試` : "歷史題目"}</div>
        {q.previousPerformance && <div className="text-zinc-400 italic mb-1">「{q.previousPerformance}」</div>}
        <div>改進方向：{q.improvementTip}</div>
      </div>
    )}
    {/* 答題方向 */}
    <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mb-3 text-xs text-amber-800 leading-relaxed">
      <span className="font-semibold">💡 答題方向：</span>{ANSWER_HINTS[q.type]}
    </div>
    {/* 答案草稿 */}
    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">我的答案</div>
    <textarea value={q.answerDraft}
      onChange={e => updateQuestion(idx, { answerDraft: e.target.value })}
      placeholder="寫下你的答案思路..."
      rows={4}
      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-zinc-400 bg-white font-inherit leading-relaxed"
    />
    <div className="flex justify-end mt-2">
      <button onClick={() => updateQuestion(idx, { prepared: !q.prepared })}
        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
          q.prepared ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
        }`}>
        {q.prepared ? "✓ 已準備" : "標記已準備"}
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 7: 加入隱藏題目折疊區**

在題目清單最後加：

```tsx
{questions.filter(q => q.round === currentRound && q.hidden).length > 0 && (
  <details className="mt-3">
    <summary className="text-xs text-zinc-400 cursor-pointer select-none hover:text-zinc-600">
      已隱藏的題目（{questions.filter(q => q.round === currentRound && q.hidden).length} 題）
    </summary>
    <div className="mt-2 space-y-1.5 opacity-50">
      {questions.filter(q => q.round === currentRound && q.hidden).map((q, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
          <span className="flex-1">{q.question}</span>
          <button onClick={() => updateQuestion(questions.indexOf(q), { hidden: false })}
            className="text-xs text-zinc-400 hover:text-zinc-700">復原</button>
        </div>
      ))}
    </div>
  </details>
)}
```

- [ ] **Step 8: 加入 handleAddManual**

```ts
function handleAddManual() {
  const text = prompt("輸入題目內容：");
  if (!text?.trim()) return;
  const newQ = normalize({ question: text.trim(), type: "行為題", round: currentRound });
  const updated = [...questions, newQ];
  setQuestions(updated);
  fetch(`/api/applications/${applicationId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ aiQuestions: updated }),
  });
}
```

- [ ] **Step 9: 更新 page.tsx 傳 jdDescription 給 ApplicationTabs**

```tsx
<ApplicationTabs
  applicationId={applicationId}
  aiQuestions={serialized.aiQuestions ?? []}
  reviews={serialized.interviewReviews ?? []}
  defaultTab={getDefaultTab(app.status)}
  jdDescription={app.jd.description}   // 新增
>
```

在 `ApplicationTabs.tsx` 的 Props 加入 `jdDescription?: string | null`，並傳給 `AiQuestionsEvolved`：

```tsx
{activeTab === "ai" && (
  <AiQuestionsEvolved
    applicationId={applicationId}
    initialQuestions={aiQuestions}
    jdDescription={jdDescription}
    onGoToReview={goToReview}
  />
)}
```

- [ ] **Step 10: Commit**

```bash
git add app/board/[applicationId]/_components/AiQuestionsEvolved.tsx \
        app/board/[applicationId]/_components/ApplicationTabs.tsx \
        app/board/[applicationId]/page.tsx
git commit -m "feat: AI prep tab - JD fold, answer drafts, hints, hidden, asked tracking"
```

---

## Task 10: 面試結束後 Checklist Modal

**Files:**
- Modify: `app/board/_components/ApplicationDetail.tsx`

- [ ] **Step 1: 加入 checklist state**

```ts
const [showChecklist, setShowChecklist] = useState(false);
const [checklistChecked, setChecklistChecked] = useState<boolean[]>([]);

const checklistQuestions = useMemo(() => {
  const qs = (application.aiQuestions ?? []) as Array<{ question: string; round?: number; hidden?: boolean }>;
  const maxRound = Math.max(...qs.map(q => q.round ?? 1), 1);
  return qs.filter(q => (q.round ?? 1) === maxRound && !q.hidden);
}, [application.aiQuestions]);
```

- [ ] **Step 2: 觸發 checklist**

在 `updateStatus` 函式末尾加入：

```ts
if (prevStatus === "interviewing" && (newStatus === "offer" || newStatus === "rejected")) {
  setChecklistChecked(checklistQuestions.map(() => false));
  setShowChecklist(true);
}
```

（需要在 `updateStatus` 開頭存下 `const prevStatus = status`）

- [ ] **Step 3: Checklist modal JSX**

在元件 JSX 末尾（toast 之前）加入：

```tsx
{showChecklist && (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 mb-2">
      <h3 className="text-base font-semibold text-zinc-900 mb-1">面試結束了！</h3>
      <p className="text-sm text-zinc-500 mb-4">哪些題目有被問到？快速勾選一下：</p>
      <div className="space-y-1.5 max-h-60 overflow-y-auto mb-5">
        {checklistQuestions.map((q, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-zinc-50">
            <input type="checkbox" checked={checklistChecked[i] ?? false}
              onChange={e => setChecklistChecked(prev => prev.map((v, idx) => idx === i ? e.target.checked : v))}
              className="mt-0.5 w-4 h-4 rounded accent-zinc-900 flex-shrink-0" />
            <span className="text-sm text-zinc-700 leading-relaxed">{q.question}</span>
          </label>
        ))}
        {checklistQuestions.length === 0 && (
          <p className="text-sm text-zinc-400 text-center py-4">還沒有 AI 面試準備題目</p>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setShowChecklist(false)}
          className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors">
          跳過
        </button>
        <button onClick={async () => {
          const allQs = (application.aiQuestions ?? []) as Array<Record<string, unknown>>;
          const updated = allQs.map((q, i) => {
            const cIdx = checklistQuestions.findIndex(cq => cq.question === q.question);
            return cIdx >= 0 && checklistChecked[cIdx] ? { ...q, askedInInterview: true } : q;
          });
          await fetch(`/api/applications/${application.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiQuestions: updated }),
          });
          setShowChecklist(false);
        }}
          className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-sm text-white font-medium hover:bg-zinc-700 transition-colors">
          完成
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: 手動驗收測試**

1. 進入一個 `interviewing` 狀態的職缺詳細頁
2. 點擊狀態下拉，改為「感謝信（被刷）」
3. 確認：出現 checklist modal
4. 勾選 1-2 個題目，按「完成」
5. 切換到「面試準備」Tab，確認勾選的題目顯示「✓ 問到了」綠色標記

- [ ] **Step 5: Commit**

```bash
git add app/board/_components/ApplicationDetail.tsx
git commit -m "feat: post-interview checklist modal, marks askedInInterview on questions"
```

---

## 完成驗收清單

- [ ] `/board` 預設顯示清單模式，漏斗統計數字正確
- [ ] 14 天未回音的投遞中職缺顯示橘色警示 + 封存 CTA
- [ ] 封存後職缺消失於主列表，出現在封存區；復原可恢復
- [ ] 切換看板模式：4 欄，面試中的卡片有輪次 badge
- [ ] 詳細頁狀態下拉含「錄取 🎉」和「感謝信（被刷）」
- [ ] 狀態切換後出現 toast，「復原」可撤回
- [ ] 詳細頁右上角封存按鈕可選原因並跳回主頁
- [ ] 未投遞時預設開推薦信 Tab，面試/投遞中預設 AI 準備，結果預設復盤
- [ ] AI 面試準備 Tab：JD 折疊、輪次切換、進度列正確
- [ ] 每題可展開寫答案、看答題方向提示
- [ ] 面試有問到標記後顯示「去復盤」連結
- [ ] 隱藏題目不計入進度，可在折疊區復原
- [ ] 狀態從面試中 → 結果時跳出 checklist modal
