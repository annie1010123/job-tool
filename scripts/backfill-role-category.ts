/**
 * 一次性回填腳本：對既有 Application 用 jd.title 推斷 roleCategory。
 * QuestionBank 舊資料不回填（保持 null）。
 *
 * 執行方式：
 *   pnpm tsx --env-file=.env.local scripts/backfill-role-category.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { inferRoleCategory } from "../lib/jobs/role-category";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const apps = await prisma.application.findMany({
    where: { roleCategory: null },
    select: { id: true, jd: { select: { title: true } } },
  });

  console.log(`回填對象：${apps.length} 筆`);

  let updated = 0;
  for (const app of apps) {
    const category = inferRoleCategory(app.jd.title);
    await prisma.application.update({
      where: { id: app.id },
      data: { roleCategory: category },
    });
    updated++;
  }

  console.log(`完成：已更新 ${updated} 筆`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
