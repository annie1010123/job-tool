import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import ApplicationDetail from "../_components/ApplicationDetail";
import ApplicationTabs from "./_components/ApplicationTabs";
import AppShell from "@/app/_components/AppShell";

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

  function getDefaultTab(status: string): "ai" | "cover-letter" | "review" | "info" {
    if (status === "not_applied" || status === "watching") return "info";
    if (status === "offer" || status === "rejected") return "review";
    return "ai";
  }

  return (
    <AppShell>
      <div className="max-w-[1040px] mx-auto px-9 py-7">
        <Link href="/board" className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-6 inline-block">
          ← 回求職追蹤
        </Link>

        {/* Header card only — tabs handled by ApplicationTabs below */}
        <div className="mb-4">
          <ApplicationDetail application={serialized} headerOnly />
        </div>

        <ApplicationTabs
          applicationId={applicationId}
          aiQuestions={serialized.aiQuestions ?? []}
          reviews={serialized.interviewReviews ?? []}
          defaultTab={getDefaultTab(app.status)}
          jdDescription={app.jd.description}
          resumeUrl={app.resumeUrl ?? null}
          roleCategory={app.roleCategory ?? null}
        >
          {/* 職缺資訊 tab content */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-zinc-400 mb-1">公司</p>
                <p className="text-sm font-medium text-zinc-800">{app.jd.companyName}</p>
              </div>
              {app.jd.location && (
                <div>
                  <p className="text-xs text-zinc-400 mb-1">地點</p>
                  <p className="text-sm text-zinc-700">{app.jd.location}</p>
                </div>
              )}
              {app.jd.salaryRange && (
                <div>
                  <p className="text-xs text-zinc-400 mb-1">薪資</p>
                  <p className="text-sm text-zinc-700">{app.jd.salaryRange}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-400 mb-1">新增日期</p>
                <p className="text-sm text-zinc-700">
                  {new Date(app.createdAt).toLocaleDateString("zh-TW")}
                </p>
              </div>
            </div>
            {!app.jd.externalUrl.startsWith("manual://") && (
              <a
                href={app.jd.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded-lg px-3 py-1.5 transition-colors"
              >
                查看原始職缺 ↗
              </a>
            )}
            {app.jd.description && (
              <div className="pt-4 border-t border-zinc-50">
                <p className="text-xs text-zinc-400 mb-2">職缺描述</p>
                <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                  {app.jd.description}
                </p>
              </div>
            )}
            {app.note && (
              <div className="pt-4 border-t border-zinc-50">
                <p className="text-xs text-zinc-400 mb-2">備註</p>
                <p className="text-sm text-zinc-600 whitespace-pre-wrap">{app.note}</p>
              </div>
            )}
          </div>
        </ApplicationTabs>
      </div>
    </AppShell>
  );
}
