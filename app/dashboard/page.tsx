import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import DashboardHome from "./_components/DashboardHome";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "剛剛";
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小時前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) return "昨天";
  return `${diffDay} 天前`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const intent = await prisma.jobIntent.findUnique({ where: { userId: session.user.id } });
  if (!intent) redirect("/onboarding/intent");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [allRecs, statsRaw, appliedApps, interviewingApps, recentApps] = await Promise.all([
    prisma.recommendation.findMany({
      where: { userId: session.user.id, dailyBatch: { gte: threeDaysAgo } },
      orderBy: { finalScore: "desc" },
      // 只取 dashboard 需要的欄位（不抓 jd.description 等大欄位，避免 90 筆 ×長文拖慢 ~3s→~0.6s）
      select: {
        id: true,
        jdId: true,
        finalScore: true,
        dailyBatch: true,
        jd: { select: { id: true, title: true, companyName: true, externalUrl: true } },
      },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId: session.user.id, isArchived: false },
      _count: { status: true },
    }),
    prisma.application.findMany({
      where: { userId: session.user.id, status: "applied", isArchived: false },
      include: { jd: { select: { companyName: true, title: true } } },
      orderBy: { appliedAt: "asc" },
      take: 20,
    }),
    prisma.application.findMany({
      where: { userId: session.user.id, status: "interviewing", isArchived: false },
      include: { jd: { select: { companyName: true, title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.application.findMany({
      where: { userId: session.user.id, isArchived: false },
      include: { jd: { select: { companyName: true, title: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  // Deduplicate recommendations
  const seen = new Map<string, typeof allRecs[number]>();
  for (const rec of allRecs) {
    const prev = seen.get(rec.jdId);
    if (!prev || rec.finalScore > prev.finalScore) seen.set(rec.jdId, rec);
  }
  const recommendations = Array.from(seen.values())
    .sort((a, b) => b.finalScore - a.finalScore);

  const statMap = Object.fromEntries(statsRaw.map((s) => [s.status, s._count.status]));
  // 累計投遞總數（含已封存，凡是進過投遞流程的都算）
  const totalApplied = await prisma.application.count({
    where: { userId: session.user.id, status: { in: ["applied", "interviewing", "second_round", "offer", "rejected"] } },
  });
  const isToday = allRecs.some((r) => r.dailyBatch >= today);
  const latestBatch = allRecs[0]?.dailyBatch ?? null;
  const batchDateStr = latestBatch
    ? `${latestBatch.getMonth() + 1}/${latestBatch.getDate()}`
    : null;

  // Build todos
  const todos: { id: string; type: "ghosted" | "needs_prep" | "new_recs"; label: string; actionLabel: string; actionHref: string }[] = [];

  // 久沒回音：已投遞超過 14 天還沒進展 → 提示追問或封存
  const GHOST_DAYS = 14;
  const now = Date.now();
  const ghosted = appliedApps.filter((app) => {
    const since = app.appliedAt ?? app.createdAt;
    return (now - new Date(since).getTime()) / 86400000 >= GHOST_DAYS;
  });
  for (const app of ghosted.slice(0, 2)) {
    const days = Math.floor((now - new Date(app.appliedAt ?? app.createdAt).getTime()) / 86400000);
    todos.push({
      id: `todo-ghost-${app.id}`,
      type: "ghosted",
      label: `${app.jd.companyName} — 久沒回音（${days} 天）`,
      actionLabel: "追問或封存",
      actionHref: `/board/${app.id}`,
    });
  }

  for (const app of interviewingApps.slice(0, 2)) {
    todos.push({
      id: `todo-interview-${app.id}`,
      type: "needs_prep",
      label: `${app.jd.companyName} — 面試準備`,
      actionLabel: "開始準備",
      actionHref: `/board/${app.id}`,
    });
  }

  if (recommendations.length > 0 && isToday) {
    todos.push({
      id: "todo-new-recs",
      type: "new_recs",
      label: `${recommendations.length} 筆新推薦職缺待查看`,
      actionLabel: "查看",
      actionHref: "/saved",
    });
  }

  // Build timeline
  const timeline: { id: string; type: "apply" | "interview" | "status"; text: string; time: string }[] = [];

  for (const app of recentApps.slice(0, 4)) {
    const timeStr = formatRelativeTime(app.updatedAt);
    if (app.status === "applied") {
      timeline.push({
        id: `tl-${app.id}`,
        type: "apply",
        text: `投遞了「${app.jd.title}」— ${app.jd.companyName}`,
        time: timeStr,
      });
    } else if (app.status === "interviewing" || app.status === "second_round") {
      timeline.push({
        id: `tl-${app.id}`,
        type: "interview",
        text: `${app.jd.companyName} — ${app.status === "second_round" ? "二面階段" : "面試中"}`,
        time: timeStr,
      });
    } else {
      timeline.push({
        id: `tl-${app.id}`,
        type: "status",
        text: `${app.jd.companyName}「${app.jd.title}」狀態更新`,
        time: timeStr,
      });
    }
  }

  const topRecs = recommendations.slice(0, 3).map((r) => ({
    id: r.id,
    finalScore: r.finalScore,
    jd: {
      id: r.jd.id,
      title: r.jd.title,
      companyName: r.jd.companyName,
      externalUrl: r.jd.externalUrl,
    },
  }));

  return (
    <AppShell>
      <DashboardHome
        userName={session.user.name ?? null}
        statMap={statMap}
        totalApplied={totalApplied}
        intentRaw={intent.rawInput}
        todos={todos}
        timeline={timeline}
        topRecs={topRecs}
        totalRecs={recommendations.length}
        batchDateStr={batchDateStr}
        isToday={isToday}
      />
    </AppShell>
  );
}
