import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Runs on the server before a page is shown.
 *  - /admin/*  -> only a logged-in admin (except /admin/login)
 *  - /orders, /cart -> any logged-in user
 * The backend ALSO checks the role on every API call, so this is not the
 * only line of defence.
 */
async function getUser(token?: string) {
  const secretText = process.env.JWT_SECRET;
  if (!token || !secretText) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secretText));
    return payload as { id: string; role: "user" | "admin"; username: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = await getUser(req.cookies.get("token")?.value);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!user || user.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }

  if ((pathname.startsWith("/orders") || pathname.startsWith("/cart")) && !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/orders/:path*", "/cart/:path*"],
};
