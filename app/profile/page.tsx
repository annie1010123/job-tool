import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import ExperienceList from "./_components/ExperienceList";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const experiences = await prisma.workExperience.findMany({
    where: { userId: session.user.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="min-h-screen" style={{ background: "#f1efe8" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ marginBottom: 4 }}>
              <a href="/dashboard" style={{ fontSize: 13, color: "#888780", textDecoration: "none" }}>← 回主頁</a>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>個人資料</h1>
            <p style={{ fontSize: 13, color: "#888780", marginTop: 2 }}>工作經歷會在生成推薦信時自動挑選最相關段落</p>
          </div>
        </div>

        <ExperienceList initialExperiences={JSON.parse(JSON.stringify(experiences))} />
      </div>
    </div>
  );
}
