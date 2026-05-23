import { config } from "dotenv";
config({ path: ".env.local" });
import { prisma } from "../../lib/db/client";

async function main() {
  const logs = await prisma.emailLog.findMany({
    take: 1, orderBy: { sentAt: "desc" },
    select: { trackingToken: true, clickedAt: true, jd: { select: { title: true } } }
  });
  for (const l of logs) {
    console.log(`title: ${l.jd.title}`);
    console.log(`token: ${l.trackingToken}`);
    console.log(`clicked: ${l.clickedAt ?? "no"}`);
  }
  await prisma.$disconnect();
}
main().catch(console.error);
