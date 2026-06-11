import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import ExperienceList from "./_components/ExperienceList";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const experiences = await prisma.workExperience.findMany({
    where: { userId: session.user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>個人資料</h1>
          <p style={{ fontSize: 13, color: "#888780", marginTop: 2 }}>工作經歷會在生成推薦信時自動挑選最相關段落</p>
        </div>
        <ExperienceList initialExperiences={JSON.parse(JSON.stringify(experiences))} />
      </div>
    </AppShell>
  );
}
