import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../../lib/db/client";

async function main() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const recs = await prisma.recommendation.findMany({
    where: { dailyBatch: today },
    select: { reasoning: true, alignedSkills: true, jd: { select: { title: true } } },
    take: 5,
  });

  for (const r of recs) {
    console.log(`\n📌 ${r.jd.title}`);
    console.log(`   理由: ${r.reasoning ?? "（無）"}`);
    console.log(`   技能: ${(r.alignedSkills as string[]).join(", ") || "（無）"}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
