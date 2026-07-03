import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import AppShell from "@/app/_components/AppShell";
import { listCoreQuestions, listAskedQuestions } from "@/lib/interview/store";
import { startOfWeekUsage } from "@/lib/interview/usage";
import InterviewClient from "./_components/InterviewClient";

export const dynamic = "force-dynamic";

export type ActiveApplication = {
  id: string;
  companyName: string;
  title: string;
  scheduledAt: string | null;
};

export default async function InterviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [core, asked, weeklyCoachUses, activeApps] = await Promise.all([
    listCoreQuestions(userId),
    listAskedQuestions(userId),
    startOfWeekUsage(userId),
    prisma.application.findMany({
      where: {
        userId,
        status: { in: ["interviewing", "second_round"] },
        isArchived: false,
      },
      include: { jd: { select: { companyName: true, title: true } } },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const serializedActive: ActiveApplication[] = activeApps.map((app) => ({
    id: app.id,
    companyName: app.jd.companyName,
    title: app.jd.title,
    scheduledAt: app.scheduledAt ? app.scheduledAt.toISOString() : null,
  }));

  return (
    <AppShell>
      <InterviewClient
        initialCore={core}
        initialAsked={asked}
        initialWeeklyUses={weeklyCoachUses}
        activeApplications={serializedActive}
      />
    </AppShell>
  );
}
