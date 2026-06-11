import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import RecommendationList from "./_components/RecommendationList";

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

  // Deduplicate by jdId across days, keep highest score
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
    <div className="min-h-screen" style={{ background: "#f1efe8" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>JobPilot</span>
            <span style={{ fontSize: 13, color: "#888780" }}>每天早上 8:00 自動推薦職缺到你的信箱</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href="/profile"
              style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.15s" }}
            >
              個人資料
            </a>
            <a
              href="/saved"
              style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.15s" }}
            >
              收藏區
            </a>
            <a
              href="/board"
              style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", textDecoration: "none", whiteSpace: "nowrap", transition: "all 0.15s" }}
            >
              投遞追蹤 →
            </a>
          </div>
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
    </div>
  );
}
