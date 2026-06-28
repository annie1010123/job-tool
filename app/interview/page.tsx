import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell from "@/app/_components/AppShell";
import { listCoreQuestions, listAskedQuestions } from "@/lib/interview/store";
import { startOfWeekUsage } from "@/lib/interview/usage";
import InterviewClient from "./_components/InterviewClient";

export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [core, asked, weeklyCoachUses] = await Promise.all([
    listCoreQuestions(userId),
    listAskedQuestions(userId),
    startOfWeekUsage(userId),
  ]);

  return (
    <AppShell>
      <InterviewClient
        initialCore={core}
        initialAsked={asked}
        initialWeeklyUses={weeklyCoachUses}
      />
    </AppShell>
  );
}
