import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import KanbanBoard from "./_components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    include: {
      jd: { select: { id: true, title: true, companyName: true, externalUrl: true, postedAt: true } },
      interviewRecords: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <a href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors">← 回推薦</a>
              <a href="/saved" style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", textDecoration: "none", whiteSpace: "nowrap" }}>收藏區</a>
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">投遞追蹤</h1>
            <p className="text-sm text-zinc-500 mt-0.5">追蹤每個職缺的投遞進度與面試紀錄</p>
          </div>
          <div className="text-sm text-zinc-400">{applications.length} 個職缺追蹤中</div>
        </div>

        <KanbanBoard initialApplications={JSON.parse(JSON.stringify(applications))} />
      </div>
    </div>
  );
}
