// 北極星指標：每週 AI 面試準備使用次數（送出答案做教練評估的次數）。
import { prisma } from "@/lib/db/client";

/** 本週（週一 00:00 起，使用者本地以 UTC+8 近似）到現在的教練評估次數。 */
export async function startOfWeekUsage(userId: string): Promise<number> {
  return prisma.coachUsage.count({
    where: { userId, createdAt: { gte: startOfThisWeek() } },
  });
}

export async function logCoachUsage(userId: string, coreKey: string | null): Promise<void> {
  await prisma.coachUsage.create({ data: { userId, coreKey } });
}

function startOfThisWeek(): Date {
  // 以 UTC+8 計算「週一」，避免半夜跨日誤差；回傳對應的 UTC 時間點。
  const now = new Date();
  const tzNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = tzNow.getUTCDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(Date.UTC(tzNow.getUTCFullYear(), tzNow.getUTCMonth(), tzNow.getUTCDate() - daysSinceMonday));
  return new Date(monday.getTime() - 8 * 60 * 60 * 1000);
}
