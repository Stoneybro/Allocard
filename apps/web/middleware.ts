import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware is intentionally minimal.
 *
 * Web3Auth stores sessions in browser localStorage, which is inaccessible
 * from server-side middleware. A hard redirect here would break the reconnection
 * flow on page reload.
 *
 * Auth gating is handled client-side by AuthProvider + ConnectRequiredCard.
 * The SESSION_SECRET cookie is a performance optimization (avoids duplicate
 * getWalletProfile calls) — not a security barrier.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/employer/:path*", "/employee/:path*", "/onboarding/:path*"],
};
