import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("callbackURL", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/fees/:path*",
    "/bursar/:path*",
    "/teacher/scores/:path*",
    "/api/teacher/scores/:path*",
    "/api/results/report-sheet/:path*",
  ],
};
