import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import ApplicationDetail from "../_components/ApplicationDetail";
import ApplicationTabs from "./_components/ApplicationTabs";

export default async function ApplicationPage({ params }: { params: Promise<{ applicationId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { applicationId } = await params;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      jd: true,
      interviewRecords: { orderBy: { interviewedAt: "desc" } },
      interviewReviews: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!app || app.userId !== session.user.id) notFound();

  const serialized = JSON.parse(JSON.stringify(app));

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <a href="/board" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-6 inline-block">
          ← 回看板
        </a>

        {/* Header card from ApplicationDetail stays as-is */}
        <div style={{ marginBottom: 16 }}>
          <ApplicationDetail application={serialized} />
        </div>

        {/* New tab navigation with evolved features */}
        <ApplicationTabs
          applicationId={applicationId}
          aiQuestions={serialized.aiQuestions ?? []}
          reviews={serialized.interviewReviews ?? []}
        >
          {/* "基本資訊" tab renders the existing ApplicationDetail info content */}
          <div style={{ fontSize: 13, color: "#999", textAlign: "center", padding: "20px 0" }}>
            基本資訊請查看上方的職缺詳情卡片
          </div>
        </ApplicationTabs>
      </div>
    </div>
  );
}
