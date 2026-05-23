import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/client";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const resume = await prisma.resume.findUnique({ where: { userId: session.user.id } });
  if (!resume) redirect("/onboarding/resume");

  const intent = await prisma.jobIntent.findUnique({ where: { userId: session.user.id } });
  if (!intent) redirect("/onboarding/intent");

  redirect("/dashboard");
}
