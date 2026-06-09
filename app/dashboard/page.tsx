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

  const todayRecs = await prisma.recommendation.findMany({
    where: { userId: session.user.id, dailyBatch: today },
    orderBy: { finalScore: "desc" },
    take: 10,
    include: { jd: true },
  });

  const latestRec = todayRecs.length === 0
    ? await prisma.recommendation.findFirst({
        where: { userId: session.user.id },
        orderBy: { dailyBatch: "desc" },
        select: { dailyBatch: true },
      })
    : null;

  const [recommendations, statsRaw] = await Promise.all([
    todayRecs.length > 0
      ? Promise.resolve(todayRecs)
      : latestRec
        ? prisma.recommendation.findMany({
            where: { userId: session.user.id, dailyBatch: latestRec.dailyBatch },
            orderBy: { finalScore: "desc" },
            take: 10,
            include: { jd: true },
          })
        : Promise.resolve([]),
    prisma.application.groupBy({
      by: ["status"],
      where: { userId: session.user.id },
      _count: { status: true },
    }),
  ]);

  const statMap = Object.fromEntries(statsRaw.map((s) => [s.status, s._count.status]));
  const isToday = todayRecs.length > 0;
  const batchDate = isToday ? today : (latestRec?.dailyBatch ?? null);
  const batchDateStr = batchDate
    ? `${batchDate.getMonth() + 1}/${batchDate.getDate()}`
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
