import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * This guard improves navigation by redirecting requests without a valid
 * Allocard session. API handlers and server actions must still authorize their
 * own data access and mutations.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get("allocard_session")?.value;
  const secret = process.env.SESSION_SECRET;
  if (token && secret && secret.length >= 32) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
      if (typeof payload.sub === "string" && typeof payload.walletAddress === "string") {
        return NextResponse.next();
      }
    } catch {
      // Treat an invalid or expired session the same as a missing session.
    }
  }

  const destination = new URL("/", request.url);
  destination.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/employer/:path*", "/employee/:path*", "/onboarding/:path*"],
};
