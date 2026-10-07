import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/board",
  "/interviews",
  "/calendar",
  "/dashboard",
  "/trash",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let mode: "demo" | "personal" =
    process.env.APP_MODE?.trim().toLowerCase() === "personal" ? "personal" : "demo";

  if (process.env.NODE_ENV !== "production") {
    const testHeader = request.headers.get("x-test-app-mode")?.trim().toLowerCase();
    if (testHeader === "personal" || testHeader === "demo") {
      mode = testHeader;
    } else {
      const queryMode = request.nextUrl.searchParams.get("mode")?.trim().toLowerCase();
      if (queryMode === "personal" || queryMode === "demo") {
        mode = queryMode;
      }
    }
  }

  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (mode === "personal") {
    const hasPersonalSession = Boolean(
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value ||
      request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value
    );

    if (pathname === "/") {
      if (hasPersonalSession) {
        return NextResponse.redirect(new URL("/board", request.url));
      }
      return NextResponse.redirect(new URL("/signin", request.url));
    }

    if (pathname === "/signin") {
      if (hasPersonalSession) {
        return NextResponse.redirect(new URL("/board", request.url));
      }
      return NextResponse.next();
    }

    if (isProtectedPath) {
      if (!hasPersonalSession) {
        const callbackUrl = encodeURIComponent(pathname + search);
        return NextResponse.redirect(new URL(`/signin?callbackUrl=${callbackUrl}`, request.url));
      }
      return NextResponse.next();
    }
  }

  if (mode === "demo") {
    if (pathname === "/signin") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (isProtectedPath) {
      const hasGuestCookie = Boolean(request.cookies.get("jt_guest_id")?.value);
      if (!hasGuestCookie) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/signin",
    "/board/:path*",
    "/interviews/:path*",
    "/calendar/:path*",
    "/dashboard/:path*",
    "/trash/:path*",
    "/settings/:path*",
  ],
};
