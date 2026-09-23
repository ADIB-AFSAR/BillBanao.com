import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = ["/login", "/register"];
const BUSINESS_COOKIE = "billing_session";
const ADMIN_COOKIE = "platform_admin_session";

async function isValidSession(token: string | undefined, requireField?: string): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (requireField && !(requireField in payload)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Platform admin area: entirely separate auth zone from the business
  // app below. A business user's session cookie is never valid here, and
  // vice versa - see lib/auth/admin-session.ts for why that's safe.
  if (pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get(ADMIN_COOKIE)?.value;
    const isAdminAuthenticated = await isValidSession(adminToken, "adminId");
    const isAdminLoginPage = pathname === "/admin/login";

    if (!isAdminAuthenticated && !isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (isAdminAuthenticated && isAdminLoginPage) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // --- Business app ---------------------------------------------------
  const token = request.cookies.get(BUSINESS_COOKIE)?.value;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const authenticated = await isValidSession(token);

  if (!authenticated && !isPublicPath && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isPublicPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
