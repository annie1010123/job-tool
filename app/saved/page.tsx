import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import SavedJobList from "./_components/SavedJobList";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id, status: "watching", isArchived: false },
    include: {
      jd: { select: { id: true, title: true, companyName: true, source: true, externalUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>收藏區</h1>
          <p style={{ fontSize: 13, color: "#888780", marginTop: 2 }}>{applications.length} 個職缺收藏中</p>
        </div>
        <SavedJobList initialApps={JSON.parse(JSON.stringify(applications))} />
      </div>
    </AppShell>
  );
}
