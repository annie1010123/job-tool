import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import KanbanBoard from "./_components/KanbanBoard";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [applications, archivedApplications] = await Promise.all([
    prisma.application.findMany({
      // 求職追蹤只顯示「投遞流程」：投遞中→面試中（一/二面）→ 結果（錄取/感謝信）
      // 不含 not_applied / watching（收藏未投遞，不屬於追蹤）
      where: {
        userId: session.user.id, isArchived: false,
        status: { in: ["applied", "interviewing", "second_round", "offer", "rejected"] },
      },
      include: {
        jd: { select: { id: true, title: true, companyName: true, externalUrl: true, postedAt: true } },
        interviewRecords: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.application.findMany({
      where: { userId: session.user.id, isArchived: true },
      include: {
        jd: { select: { id: true, title: true, companyName: true, externalUrl: true, postedAt: true } },
        interviewRecords: true,
      },
      orderBy: { archivedAt: "desc" },
    }),
  ]);

  return (
    <AppShell>
      <div className="max-w-[1040px] mx-auto px-9 py-7">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-zinc-900">求職追蹤</h1>
          <p className="text-sm text-zinc-500 mt-0.5">追蹤每個職缺的投遞進度與面試紀錄</p>
        </div>
        {(() => {
          const Board = KanbanBoard as React.ComponentType<{ initialApplications: unknown; initialArchivedApplications: unknown }>;
          return (
            <Board
              initialApplications={JSON.parse(JSON.stringify(applications))}
              initialArchivedApplications={JSON.parse(JSON.stringify(archivedApplications))}
            />
          );
        })()}
      </div>
    </AppShell>
  );
}
