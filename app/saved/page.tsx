import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import FindJobTabs from "./_components/FindJobTabs";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

export default async function FindJobPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [intent, user] = await Promise.all([
    prisma.jobIntent.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { locationFilter: true } }),
  ]);
  if (!intent) redirect("/onboarding/intent");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [allRecs, watchingApps] = await Promise.all([
    prisma.recommendation.findMany({
      where: { userId: session.user.id, dailyBatch: { gte: threeDaysAgo } },
      orderBy: { finalScore: "desc" },
      include: { jd: true },
    }),
    prisma.application.findMany({
      where: { userId: session.user.id, status: "watching", isArchived: false },
      include: {
        jd: { select: { id: true, title: true, companyName: true, source: true, externalUrl: true } },
      },
      orderBy: { createdAt: "desc" },
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

  const isToday = allRecs.some((r) => r.dailyBatch >= today);
  const latestBatch = allRecs[0]?.dailyBatch ?? null;
  const batchDateStr = latestBatch
    ? `${latestBatch.getMonth() + 1}/${latestBatch.getDate()}`
    : null;

  return (
    <AppShell>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a18" }}>找工作</h1>
          <p style={{ fontSize: 13, color: "#888780", marginTop: 4 }}>AI 推薦職缺與你的收藏</p>
        </div>
        <FindJobTabs
          recommendations={JSON.parse(JSON.stringify(recommendations))}
          watchingApps={JSON.parse(JSON.stringify(watchingApps))}
          intentRaw={intent.rawInput}
          keywords={intent.expandedKeywords as string[]}
          locationFilter={user?.locationFilter ?? ["台北市", "新北市"]}
          batchDateStr={batchDateStr}
          isToday={isToday}
        />
      </div>
    </AppShell>
  );
}
