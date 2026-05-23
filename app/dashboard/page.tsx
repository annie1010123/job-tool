import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [resume, intent] = await Promise.all([
    prisma.resume.findUnique({ where: { userId: session.user.id } }),
    prisma.jobIntent.findUnique({ where: { userId: session.user.id } }),
  ]);

  if (!resume) redirect("/onboarding/resume");
  if (!intent) redirect("/onboarding/intent");

  const keywords = intent.expandedKeywords as string[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recommendations = await prisma.recommendation.findMany({
    where: { userId: session.user.id, dailyBatch: today },
    orderBy: { finalScore: "desc" },
    take: 10,
    include: { jd: true },
  });

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-1">JobPilot</h1>
        <p className="text-zinc-500 text-sm mb-8">
          每天早上 8:00 自動推薦職缺到你的信箱
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Resume card */}
          <div className="rounded-xl bg-white border border-zinc-100 p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">你的履歷</p>
            <p className="font-medium text-zinc-900">{resume.title ?? "未知職稱"}</p>
            <p className="text-sm text-zinc-500 mt-1">
              {resume.seniority ?? ""} · {resume.yearsExperience != null ? `${resume.yearsExperience} 年經驗` : ""}
            </p>
            {Array.isArray(resume.skills) && resume.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {(resume.skills as string[]).slice(0, 6).map((s) => (
                  <span key={s} className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-2 py-0.5">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Intent card */}
          <div className="rounded-xl bg-white border border-zinc-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">求職意圖</p>
              <a
                href="/onboarding/intent"
                className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-2"
              >
                編輯
              </a>
            </div>
            <p className="text-sm text-zinc-700 mb-3">{intent.rawInput}</p>
            <div className="flex flex-wrap gap-1">
              {keywords.slice(0, 6).map((kw) => (
                <span key={kw} className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">{kw}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white border border-zinc-100 p-5 shadow-sm">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">今日推薦職缺</p>

          {recommendations.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-8">
              職缺配對中⋯ 明天早上 8:00 會寄到你的信箱 📬
            </p>
          ) : (
            <div className="divide-y divide-zinc-50">
              {recommendations.map((rec) => (
                <a
                  key={rec.id}
                  href={rec.jd.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-zinc-50 -mx-5 px-5 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900 truncate">{rec.jd.title}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">{rec.jd.companyName}</p>
                    {rec.reasoning && (
                      <p className="text-xs text-zinc-400 mt-1 italic">{rec.reasoning}</p>
                    )}
                    {(rec.alignedSkills as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(rec.alignedSkills as string[]).map((s) => (
                          <span key={s} className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {rec.jd.location && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5">{rec.jd.location}</span>
                      )}
                      {rec.jd.salaryRange && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5">{rec.jd.salaryRange}</span>
                      )}
                      {rec.jd.remote && (
                        <span className="text-xs bg-blue-50 text-blue-600 rounded-full px-2 py-0.5">可遠端</span>
                      )}
                      {rec.jd.recruitmentActivity && (
                        <span className="text-xs bg-green-50 text-green-700 rounded-full px-2 py-0.5">徵才{rec.jd.recruitmentActivity}</span>
                      )}
                      {rec.jd.replyDays && (
                        <span className="text-xs bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">{rec.jd.replyDays}</span>
                      )}
                      {rec.jd.contactTime && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 rounded-full px-2 py-0.5">{rec.jd.contactTime}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-medium text-zinc-400">相符度</span>
                    <p className="text-lg font-semibold text-zinc-900">{Math.round(rec.finalScore * 100)}%</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
