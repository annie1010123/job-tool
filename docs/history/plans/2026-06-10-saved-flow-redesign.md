# 收藏區與投遞流程重設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unified flow: Dashboard [收藏] → Application(watching) → 收藏區 → [投遞] auto-sets today → 投遞追蹤

**Architecture:** Add `watching` status to Application model (no new model); SavedJob model kept but no longer written to. Update TrackButton, saved/page.tsx, SavedJobList, AddJobModal, board query, and detail page. Add `resumeUrl` field to Application for continuity from 收藏 → 投遞追蹤.

**Tech Stack:** Next.js 15 App Router, Prisma, PostgreSQL (Supabase), TypeScript, pnpm

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `resumeUrl String?` to Application |
| `app/api/applications/route.ts` | POST: accept `status` field (default `"not_applied"`) |
| `app/api/applications/[id]/route.ts` | PATCH: add `resumeUrl` support |
| `app/dashboard/_components/TrackButton.tsx` | Send `status: "watching"`, update success text → link to /saved |
| `app/board/page.tsx` | Exclude `status: watching` from active applications query |
| `app/board/[applicationId]/page.tsx` | `getDefaultTab`: add `"watching"` → `"cover-letter"`, add ResumeUrlInput |
| `app/board/[applicationId]/_components/ResumeUrlInput.tsx` | New client component — resumeUrl input with auto-save on blur |
| `app/saved/page.tsx` | Query `Application(status: "watching")` with jd include |
| `app/saved/_components/SavedJobList.tsx` | Full rewrite: WatchingApp[] type, handleApply → PATCH, handleDelete → DELETE app |
| `app/saved/_components/AddJobModal.tsx` | Call POST /api/applications (not /api/saved-jobs), simplify interface |

---

### Task 1: Schema — add resumeUrl to Application

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add resumeUrl field to Application model**

In `prisma/schema.prisma`, find the Application model. After `aiQuestions   Json      @default("[]")`, add:

```prisma
resumeUrl     String?
```

The Application model fields section should look like:
```prisma
model Application {
  id            String    @id @default(cuid())
  userId        String
  jdId          String
  status        String    @default("not_applied")
  companyType   String?
  appliedAt     DateTime?
  scheduledAt   DateTime?
  note          String?
  aiQuestions   Json      @default("[]")
  resumeUrl     String?
  isArchived    Boolean   @default(false)
  archiveReason String?
  archivedAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  ...relations
}
```

- [ ] **Step 2: Push schema to DB and regenerate Prisma client**

```bash
cd "/Users/annie24578/Desktop/vibe coding/job-tool"
pnpm prisma db push
pnpm prisma generate
```

Expected output includes:
- `Your database is now in sync with your Prisma schema.`
- `Generated Prisma Client`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add resumeUrl field to Application for cover letter tracking"
```

---

### Task 2: API — POST accepts status, PATCH accepts resumeUrl

**Files:**
- Modify: `app/api/applications/route.ts`
- Modify: `app/api/applications/[id]/route.ts`

- [ ] **Step 1: Update POST route — manual add path accepts status**

In `app/api/applications/route.ts`, the manual add path (no jdId) creates the Application.
Change the `create` block to accept `body.status`:

```ts
// Before (in the "no jdId" path):
create: {
  userId: session.user.id,
  jdId: jd.id,
  status: "not_applied",
  companyType: companyType ?? null,
},

// After:
create: {
  userId: session.user.id,
  jdId: jd.id,
  status: body.status ?? "not_applied",
  companyType: companyType ?? null,
},
```

- [ ] **Step 2: Update POST route — from-recommendation path accepts status**

In the same file, the recommendation path (has jdId) also creates the Application.
Change its `create` block:

```ts
// Before:
create: { userId: session.user.id, jdId: body.jdId, status: "not_applied" },

// After:
create: { userId: session.user.id, jdId: body.jdId, status: body.status ?? "not_applied" },
```

- [ ] **Step 3: Update PATCH route — accept resumeUrl**

In `app/api/applications/[id]/route.ts`, in the `prisma.application.update` `data:` block, add one line:

```ts
data: {
  ...(body.status !== undefined && { status: body.status }),
  ...(body.companyType !== undefined && { companyType: body.companyType }),
  ...(body.appliedAt !== undefined && { appliedAt: body.appliedAt ? new Date(body.appliedAt) : null }),
  ...(body.scheduledAt !== undefined && { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null }),
  ...(body.note !== undefined && { note: body.note }),
  ...(body.aiQuestions !== undefined && { aiQuestions: body.aiQuestions }),
  ...(body.resumeUrl !== undefined && { resumeUrl: body.resumeUrl ?? null }),   // ← add this line
  ...(body.isArchived    !== undefined && { isArchived: body.isArchived }),
  ...(body.archiveReason !== undefined && { archiveReason: body.archiveReason ?? null }),
  ...(body.archivedAt    !== undefined && { archivedAt: body.archivedAt ? new Date(body.archivedAt) : null }),
},
```

- [ ] **Step 4: Commit**

```bash
git add app/api/applications/route.ts app/api/applications/[id]/route.ts
git commit -m "feat: API supports custom status on create, resumeUrl on update"
```

---

### Task 3: TrackButton — create watching, link to /saved

**Files:**
- Modify: `app/dashboard/_components/TrackButton.tsx`

Current file sends `{ jdId }` and creates `not_applied`. New: sends `{ jdId, status: "watching" }`, done state links to /saved.

- [ ] **Step 1: Replace TrackButton.tsx with new content**

Full new content for `app/dashboard/_components/TrackButton.tsx`:

```tsx
"use client";

import { useState } from "react";

export default function TrackButton({ jdId }: { jdId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleTrack() {
    setLoading(true);
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jdId, status: "watching" }),
    });
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-green-600 font-medium">已收藏 ✓</span>
        <a
          href="/saved"
          className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2 transition-colors"
        >
          去收藏區
        </a>
      </div>
    );
  }

  return (
    <button
      onClick={handleTrack}
      disabled={loading}
      className="text-xs bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {loading ? "收藏中…" : "收藏"}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/_components/TrackButton.tsx
git commit -m "feat: TrackButton creates watching Application, links to /saved"
```

---

### Task 4: Board page + detail page — exclude watching, fix default tab

**Files:**
- Modify: `app/board/page.tsx`
- Modify: `app/board/[applicationId]/page.tsx`

- [ ] **Step 1: Exclude watching from active applications query in board/page.tsx**

In `app/board/page.tsx`, the first `prisma.application.findMany` (active, non-archived). Change its `where`:

```ts
// Before:
where: { userId: session.user.id, isArchived: false },

// After:
where: { userId: session.user.id, isArchived: false, status: { not: "watching" } },
```

The archived query (second findMany) does NOT need changing — archived apps with watching status won't show on board anyway.

- [ ] **Step 2: Add watching to getDefaultTab in applicationId/page.tsx**

In `app/board/[applicationId]/page.tsx`, update `getDefaultTab`:

```ts
// Before:
function getDefaultTab(status: string): "ai" | "cover-letter" | "review" | "info" {
  if (status === "not_applied") return "cover-letter";
  if (status === "offer" || status === "rejected") return "review";
  return "ai";
}

// After:
function getDefaultTab(status: string): "ai" | "cover-letter" | "review" | "info" {
  if (status === "not_applied" || status === "watching") return "cover-letter";
  if (status === "offer" || status === "rejected") return "review";
  return "ai";
}
```

- [ ] **Step 3: Commit**

```bash
git add app/board/page.tsx app/board/[applicationId]/page.tsx
git commit -m "feat: board excludes watching apps; cover-letter tab default for watching"
```

---

### Task 5: Saved page — rewrite to use Application(watching)

**Files:**
- Modify: `app/saved/page.tsx`
- Modify: `app/saved/_components/SavedJobList.tsx`

- [ ] **Step 1: Replace saved/page.tsx**

Full new content for `app/saved/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import SavedJobList from "./_components/SavedJobList";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id, status: "watching", isArchived: false },
    include: {
      jd: { select: { id: true, title: true, companyName: true, source: true, externalUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen" style={{ background: "#f1efe8" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <a href="/dashboard" style={{ fontSize: 13, color: "#888780", textDecoration: "none" }}>← 回推薦</a>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>職缺收藏區</h1>
            <p style={{ fontSize: 13, color: "#888780", marginTop: 2 }}>{applications.length} 個職缺收藏中</p>
          </div>
          <a href="/board" style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", textDecoration: "none" }}>
            投遞追蹤 →
          </a>
        </div>
        <SavedJobList initialApps={JSON.parse(JSON.stringify(applications))} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace SavedJobList.tsx**

Full new content for `app/saved/_components/SavedJobList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AddJobModal from "./AddJobModal";

interface WatchingApp {
  id: string;
  companyType: string | null;
  createdAt: string;
  jd: {
    id: string;
    title: string;
    companyName: string;
    source: string;
    externalUrl: string;
  };
}

const PLATFORM_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  "104": { bg: "#E6F1FB", color: "#0C447C", label: "104" },
  linkedin: { bg: "#E8F4F8", color: "#0A66C2", label: "LinkedIn" },
  cake: { bg: "#FFF3E6", color: "#E67E22", label: "Cake" },
  yourator: { bg: "#E8F8E8", color: "#2E7D32", label: "Yourator" },
  manual: { bg: "#f7f6f3", color: "#888780", label: "手動新增" },
  other: { bg: "#f7f6f3", color: "#888780", label: "其他" },
};

const COMPANY_TYPE_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  startup: { bg: "#FFF3E6", color: "#E67E22", label: "新創" },
  large: { bg: "#E6F1FB", color: "#0C447C", label: "大公司" },
  traditional: { bg: "#f7f6f3", color: "#888780", label: "傳產" },
};

const TYPE_OPTIONS = ["全部", "startup", "large", "traditional"] as const;

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SavedJobList({ initialApps }: { initialApps: WatchingApp[] }) {
  const router = useRouter();
  const [apps, setApps] = useState<WatchingApp[]>(initialApps);
  const [typeFilter, setTypeFilter] = useState<string>("全部");
  const [showAddModal, setShowAddModal] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const filtered = apps.filter((a) =>
    typeFilter === "全部" || a.companyType === typeFilter
  );

  async function handleApply(appId: string) {
    setApplyingId(appId);
    try {
      const resp = await fetch(`/api/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "applied", appliedAt: new Date().toISOString() }),
      });
      if (resp.ok) {
        setApps((prev) => prev.filter((a) => a.id !== appId));
      }
    } finally {
      setApplyingId(null);
    }
  }

  async function handleDelete(appId: string) {
    const resp = await fetch(`/api/applications/${appId}`, { method: "DELETE" });
    if (resp.ok) {
      setApps((prev) => prev.filter((a) => a.id !== appId));
    }
  }

  const pillBase: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 20,
    border: "0.5px solid rgba(0,0,0,0.15)", cursor: "pointer",
    background: "#fff", color: "#1a1a18", transition: "background 0.15s",
  };
  const pillActive: React.CSSProperties = {
    ...pillBase, background: "#1a1a18", color: "#fff", border: "0.5px solid #1a1a18",
  };

  return (
    <>
      {/* Filter + Add button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TYPE_OPTIONS.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} style={typeFilter === t ? pillActive : pillBase}>
              {t === "全部" ? "全部類型" : (COMPANY_TYPE_BADGES[t]?.label ?? t)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ fontSize: 13, fontWeight: 500, padding: "7px 16px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer" }}
        >
          ＋新增職缺
        </button>
      </div>

      {/* Job cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#888780" }}>
          <p style={{ fontSize: 15 }}>還沒有收藏的職缺</p>
          <a href="/dashboard" style={{ fontSize: 13, color: "#888780", marginTop: 8, display: "inline-block" }}>→ 去推薦頁找職缺</a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((app) => {
            const pBadge = PLATFORM_BADGES[app.jd.source] ?? PLATFORM_BADGES.other;
            const tBadge = app.companyType ? COMPANY_TYPE_BADGES[app.companyType] : null;
            return (
              <div
                key={app.id}
                style={{
                  background: "#fff", borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.1)",
                  padding: "14px 18px", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a18" }}>{app.jd.companyName}</span>
                    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: pBadge.bg, color: pBadge.color }}>
                      {pBadge.label}
                    </span>
                    {tBadge && (
                      <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: tBadge.bg, color: tBadge.color }}>
                        {tBadge.label}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#444440", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {app.jd.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#aaa8a0", marginTop: 4 }}>收藏於 {formatDate(app.createdAt)}</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <a
                    href={`/board/${app.id}`}
                    style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.15)", background: "#fff", color: "#1a1a18", textDecoration: "none", whiteSpace: "nowrap" }}
                  >
                    準備推薦信
                  </a>
                  <button
                    onClick={() => handleApply(app.id)}
                    disabled={applyingId === app.id}
                    style={{ fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 20, border: "none", background: "#1a1a18", color: "#fff", cursor: "pointer", opacity: applyingId === app.id ? 0.5 : 1 }}
                  >
                    {applyingId === app.id ? "投遞中…" : "投遞"}
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    style={{ fontSize: 12, color: "#aaa8a0", background: "none", border: "none", cursor: "pointer", padding: "4px 6px" }}
                  >
                    刪除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/saved/page.tsx app/saved/_components/SavedJobList.tsx
git commit -m "feat: saved page reads Application(watching); one-click apply sets today's date"
```

---

### Task 6: AddJobModal — POST /api/applications

**Files:**
- Modify: `app/saved/_components/AddJobModal.tsx`

The modal currently calls `POST /api/saved-jobs`. Change it to `POST /api/applications` with `status: "watching"`. The `onAdded` callback no longer receives a job argument (parent calls `router.refresh()` instead).

- [ ] **Step 1: Remove SavedJob interface and update prop type**

At the top of `AddJobModal.tsx`, delete the `SavedJob` interface (lines 5–16).

Change the `onAdded` prop:
```ts
// Before:
onAdded: (job: SavedJob) => void;

// After:
onAdded: () => void;
```

- [ ] **Step 2: Remove platform state and UI**

Remove the line:
```ts
const [platform, setPlatform] = useState("other");
```

Remove the `PLATFORM_OPTIONS` constant.

Remove the entire "平台" `<div>` block from the form (the block containing the `<select>` with `PLATFORM_OPTIONS.map(...)`).

- [ ] **Step 3: Replace handleSave**

```ts
async function handleSave(e: React.FormEvent) {
  e.preventDefault();
  if (!companyName.trim() || !jobTitle.trim()) {
    setError("公司名稱和職缺名稱為必填");
    return;
  }
  setSaving(true);
  setError("");
  try {
    const resp = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        sourceUrl: parseUrl.trim() || undefined,
        companyType: companyType || null,
        status: "watching",
      }),
    });
    if (!resp.ok) {
      const d = await resp.json().catch(() => ({}));
      setError((d as { error?: string }).error ?? "儲存失敗，請再試一次");
      return;
    }
    onAdded();
  } finally {
    setSaving(false);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add app/saved/_components/AddJobModal.tsx
git commit -m "feat: AddJobModal creates Application(watching) instead of SavedJob"
```

---

### Task 7: Detail page — resumeUrl input field

**Files:**
- Create: `app/board/[applicationId]/_components/ResumeUrlInput.tsx`
- Modify: `app/board/[applicationId]/page.tsx`

- [ ] **Step 1: Create ResumeUrlInput.tsx**

New file `app/board/[applicationId]/_components/ResumeUrlInput.tsx`:

```tsx
"use client";

import { useState } from "react";

export default function ResumeUrlInput({
  applicationId,
  initialValue,
}: {
  applicationId: string;
  initialValue: string | null;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (value === (initialValue ?? "")) return;
    setSaving(true);
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeUrl: value.trim() || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <p className="text-xs text-zinc-400 mb-1">履歷連結</p>
      <div className="flex gap-2 items-center">
        <input
          type="url"
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); }}
          onBlur={save}
          placeholder="Canva 連結、PDF URL…"
          className="flex-1 text-sm text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 outline-none focus:border-zinc-400 transition-colors"
        />
        {saving && <span className="text-xs text-zinc-400 shrink-0">儲存中…</span>}
        {saved && <span className="text-xs text-green-600 shrink-0">已儲存</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add import to applicationId/page.tsx**

In `app/board/[applicationId]/page.tsx`, add at the top with other imports:

```ts
import ResumeUrlInput from "./_components/ResumeUrlInput";
```

- [ ] **Step 3: Add ResumeUrlInput to info tab**

In the same file, inside `<ApplicationTabs>`, after the closing `</div>` of the `grid grid-cols-2` block (around line 73) and before the `{!app.jd.externalUrl.startsWith("manual://") && ...}` line, add:

```tsx
<ResumeUrlInput
  applicationId={applicationId}
  initialValue={app.resumeUrl ?? null}
/>
```

The info tab `<div className="space-y-4">` will then look like:
```tsx
<div className="space-y-4">
  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
    {/* 公司、地點、薪資、新增日期 */}
  </div>
  <ResumeUrlInput applicationId={applicationId} initialValue={app.resumeUrl ?? null} />
  {!app.jd.externalUrl.startsWith("manual://") && (
    <a ...>查看原始職缺 ↗</a>
  )}
  ...
</div>
```

- [ ] **Step 4: Commit**

```bash
git add app/board/[applicationId]/_components/ResumeUrlInput.tsx app/board/[applicationId]/page.tsx
git commit -m "feat: add resumeUrl input field to application detail info tab"
```

---

## Verification Checklist

After all tasks complete, verify these flows in the browser (Playwright):

1. Dashboard → click 「收藏」on a recommendation → button shows「已收藏 ✓ 去收藏區」
2. Click「去收藏區」→ /saved shows the job card with「準備推薦信」+「投遞」buttons
3. /board shows that same job does NOT appear
4. Click「準備推薦信」→ opens /board/[id] on 推薦信 tab
5. Click「投遞」on /saved → card disappears; go to /board → job appears with status 投遞中
6. Open /board/[id] info tab → see「履歷連結」input; type a URL, blur → saves (shows 已儲存)
7. /saved → click「＋新增職缺」→ paste URL → save → card appears (router.refresh())
