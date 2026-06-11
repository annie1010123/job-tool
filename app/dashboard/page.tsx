import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import RecommendationList from "./_components/RecommendationList";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const intent = await prisma.jobIntent.findUnique({ where: { userId: session.user.id } });
  if (!intent) redirect("/onboarding/intent");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [allRecs, statsRaw] = await Promise.all([
    prisma.recommendation.findMany({
      where: { userId: session.user.id, dailyBatch: { gte: threeDaysAgo } },
      orderBy: { finalScore: "desc" },
      include: { jd: true },
    }),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId: session.user.id },
      _count: { status: true },
    }),
  ]);

  const seen = new Map<string, typeof allRecs[number]>();
  for (const rec of allRecs) {
    const prev = seen.get(rec.jdId);
    if (!prev || rec.finalScore > prev.finalScore) seen.set(rec.jdId, rec);
  }
  const recommendations = Array.from(seen.values())
    .sort((a, b) => b.finalScore - a.finalScore);

  const statMap = Object.fromEntries(statsRaw.map((s) => [s.status, s._count.status]));
  const isToday = allRecs.some((r) => r.dailyBatch >= today);
  const latestBatch = allRecs[0]?.dailyBatch ?? null;
  const batchDateStr = latestBatch
    ? `${latestBatch.getMonth() + 1}/${latestBatch.getDate()}`
    : null;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>今日推薦</h1>
          <p style={{ fontSize: 13, color: "#888780", marginTop: 2 }}>每天 21:30 自動更新，保留近三天職缺</p>
        </div>
        <RecommendationList
          recommendations={JSON.parse(JSON.stringify(recommendations))}
          statMap={statMap}
          batchDateStr={batchDateStr}
          isToday={isToday}
          keywords={intent.expandedKeywords as string[]}
          intentRaw={intent.rawInput}
        />
      </div>
    </AppShell>
  );
}
