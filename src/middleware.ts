import { NextResponse, type NextRequest } from "next/server";
import { USER_COOKIE, USER_COOKIE_MAX_AGE, isValidUserId, newUserId } from "@/lib/user-id";

// Only mints the anonymous id cookie. The User row is created lazily by
// getOrCreateUser() on the server, never here.
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(USER_COOKIE)?.value;
  if (existing && isValidUserId(existing)) return NextResponse.next();

  const id = newUserId();
  // Make the cookie visible to this same request's server code...
  request.cookies.set(USER_COOKIE, id);
  const response = NextResponse.next({ request: { headers: request.headers } });
  // ...and persist it in the browser.
  response.cookies.set(USER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: USER_COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
