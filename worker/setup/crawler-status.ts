import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../../lib/db/client";

async function main() {
  const total = await prisma.jd.count();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.jd.count({ where: { crawledAt: { gte: today } } });
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
  const weekCount = await prisma.jd.count({ where: { crawledAt: { gte: sevenDaysAgo } } });
  const withDesc = await prisma.jd.count({ where: { description: { not: null } } });
  const latest = await prisma.jd.findFirst({
    where: { source: { not: "manual" } },
    orderBy: { crawledAt: "desc" },
    select: { crawledAt: true, title: true, source: true },
  });
  const intents = await prisma.jobIntent.findMany({ select: { expandedKeywords: true } });
  const keywords = [...new Set(intents.flatMap((i) => i.expandedKeywords as string[]))];

  console.log("=== 爬蟲狀況報告 ===");
  console.log(`JD 總數: ${total}（有描述: ${withDesc}，無描述: ${total - withDesc}）`);
  console.log(`今天新增: ${todayCount}`);
  console.log(`近 7 天新增: ${weekCount}`);
  console.log(`最新一筆: ${latest?.crawledAt?.toLocaleString("zh-TW")} | ${latest?.source} | ${latest?.title?.slice(0, 40)}`);
  console.log(`關鍵字數: ${keywords.length}`);
  console.log(`關鍵字列表: ${keywords.join(", ")}`);
  await prisma.$disconnect();
}
main().catch(console.error);
