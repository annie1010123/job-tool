import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import SavedJobList from "./_components/SavedJobList";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const jobs = await prisma.savedJob.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: "desc" },
  });

  return (
    <div className="min-h-screen" style={{ background: "#f1efe8" }}>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <a href="/dashboard" style={{ fontSize: 13, color: "#888780", textDecoration: "none" }}>← 回推薦</a>
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a18" }}>職缺收藏區</h1>
            <p style={{ fontSize: 13, color: "#888780", marginTop: 2 }}>{jobs.length} 個職缺收藏中</p>
          </div>
          <a href="/board" style={{ fontSize: 13, fontWeight: 500, padding: "8px 18px", borderRadius: 20, border: "0.5px solid rgba(0,0,0,0.2)", background: "#fff", color: "#1a1a18", textDecoration: "none" }}>
            投遞追蹤 →
          </a>
        </div>
        <SavedJobList initialJobs={JSON.parse(JSON.stringify(jobs))} />
      </div>
    </div>
  );
}
