import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import FindJobPage from "./_components/FindJobPage";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const intent = await prisma.jobIntent.findUnique({ where: { userId: session.user.id } });
  if (!intent) redirect("/onboarding/intent");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const allRecs = await prisma.recommendation.findMany({
    where: { userId: session.user.id, dailyBatch: { gte: threeDaysAgo } },
    orderBy: { finalScore: "desc" },
    // 清單不需要 jd.description（長文，90 筆會拖慢 ~5s→~0.7s）；description 改由 Modal 開啟時才抓
    select: {
      id: true,
      finalScore: true,
      reasoning: true,
      alignedSkills: true,
      jdId: true,
      dailyBatch: true,
      jd: {
        select: {
          id: true, title: true, companyName: true, location: true, salaryRange: true,
          skills: true, recruitmentActivity: true, replyDays: true, postedAt: true,
          seniority: true, externalUrl: true, crawledAt: true, source: true,
        },
      },
    },
  });

  // 排除「已處理過」的職缺：只要有 application（已投遞 / 已刪除跳過都算），就不再出現在找工作
  // 邏輯：找工作 = 還沒處理的職缺；申請 → 進求職追蹤、刪除 → 跳過，兩者都從這裡消失（持久化）
  const handledApps = await prisma.application.findMany({
    where: { userId: session.user.id },
    select: { jdId: true },
  });
  const handledJdIds = new Set(handledApps.map((a) => a.jdId));

  // Deduplicate: keep best score per jdId；同時濾掉已處理的
  const seen = new Map<string, typeof allRecs[number]>();
  for (const rec of allRecs) {
    if (handledJdIds.has(rec.jdId)) continue;
    const prev = seen.get(rec.jdId);
    if (!prev || rec.finalScore > prev.finalScore) seen.set(rec.jdId, rec);
  }
  const recommendations = Array.from(seen.values())
    .sort((a, b) => b.finalScore - a.finalScore);

  const latestBatch = allRecs[0]?.dailyBatch ?? null;
  const batchDateStr = latestBatch
    ? `${latestBatch.getMonth() + 1}/${latestBatch.getDate()}`
    : null;

  return (
    <AppShell>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 36px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18" }}>找工作</h1>
          <p style={{ fontSize: 13, color: "#888780", marginTop: 4 }}>AI 推薦職缺，點擊查看詳情</p>
        </div>
        <FindJobPage
          recommendations={JSON.parse(JSON.stringify(recommendations))}
          intentRaw={intent.rawInput}
          keywords={intent.expandedKeywords as string[]}
          batchDateStr={batchDateStr}
        />
      </div>
    </AppShell>
  );
}
