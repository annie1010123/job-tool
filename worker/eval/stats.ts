import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../../lib/db/client";

const PM_KEYWORDS = ["專案管理", "PM", "Project Management", "專案助理", "產品管理", "產品助理", "project manager"];

async function main() {
  const [total, withEmb] = await Promise.all([
    prisma.jd.count(),
    prisma.jdEmbedding.count(),
  ]);
  const jds = await prisma.jd.findMany({ select: { title: true } });
  const relevant = jds.filter(j =>
    PM_KEYWORDS.some(k => j.title.toLowerCase().includes(k.toLowerCase()))
  ).length;
  console.log(`總職缺: ${total}, 有 embedding: ${withEmb}, 相關職缺 (gold): ${relevant}`);
  await prisma.$disconnect();
}
main().catch(console.error);
