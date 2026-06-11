import { config } from "dotenv";
config({ path: ".env.local" });

import { prisma } from "../../lib/db/client";
import { sendPreviewEmail } from "../../lib/match/preview";

async function main() {
  const users = await prisma.user.findMany({
    where: { jobIntent: { isNot: null } },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log("沒有設定求職意圖的用戶");
    await prisma.$disconnect();
    return;
  }

  for (const user of users) {
    console.log(`▶ 寄送預覽 email 給 ${user.email}...`);
    await sendPreviewEmail(user.id, user.email!);
    console.log(`  ✅ 已寄出`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
