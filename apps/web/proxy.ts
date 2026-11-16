import { SESSION_COOKIE } from "@greenquote/domain";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

/** UX only: sends visitors without a session cookie to /login. The API enforces access. */
export function proxy(request: NextRequest) {
  if (
    PUBLIC_PATHS.includes(request.nextUrl.pathname) ||
    request.cookies.has(SESSION_COOKIE)
  ) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api/|_next/|.*\\.svg$|favicon\\.ico$).*)"],
};
