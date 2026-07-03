import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";
import ProfileInfoCard from "./_components/ProfileInfoCard";
import ExperienceList from "./_components/ExperienceList";
import AppShell from "@/app/_components/AppShell";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, experiences] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, school: true, department: true, grade: true, portfolioUrl: true, linkedinUrl: true },
    }),
    prisma.workExperience.findMany({
      where: { userId: session.user.id },
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <AppShell>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "28px 36px" }}>
        <ProfileInfoCard initial={user} />
        <div style={{ marginTop: 24 }}>
          <ExperienceList initialExperiences={JSON.parse(JSON.stringify(experiences))} />
        </div>
      </div>
    </AppShell>
  );
}
