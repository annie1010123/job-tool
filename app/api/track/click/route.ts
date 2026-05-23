import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect("https://www.104.com.tw");
  }

  const log = await prisma.emailLog.findUnique({
    where: { trackingToken: token },
    select: { jd: { select: { externalUrl: true } }, clickedAt: true },
  });

  if (!log) {
    return NextResponse.redirect("https://www.104.com.tw");
  }

  // Record first click only
  if (!log.clickedAt) {
    await prisma.emailLog.update({
      where: { trackingToken: token },
      data: { clickedAt: new Date() },
    });
  }

  return NextResponse.redirect(log.jd.externalUrl);
}
