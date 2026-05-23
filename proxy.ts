import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC = ["/login", "/verify-request", "/api/auth", "/api/cron", "/api/track"];

export default auth((req: NextRequest & { auth: unknown }) => {
  const isPublic = PUBLIC.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
