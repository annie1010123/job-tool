import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../../lib/db/client";

async function main() {
  const [total, withDesc, sample] = await Promise.all([
    prisma.jd.count(),
    prisma.jd.count({ where: { description: { not: null } } }),
    prisma.jd.findFirst({ where: { description: { not: null } }, select: { title: true, description: true } }),
  ]);
  console.log(`總數: ${total}, 有 description: ${withDesc}, 缺少: ${total - withDesc}`);
  if (sample) console.log(`\n範例:\n${sample.title}\n${sample.description?.slice(0, 150)}`);
  await prisma.$disconnect();
}
main().catch(console.error);
