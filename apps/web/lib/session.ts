"use server";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { cache } from "react";

const SESSION_COOKIE_NAME = "allocard_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24; // 24 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(walletAddress: string) {
  const token = await new SignJWT({ sub: walletAddress })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SEC,
    path: "/",
  });
}

export async function getSessionWalletAddress(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Cached version — call once per request on server pages.
 * Returns null if no valid session.
 */
export const getCachedSessionWalletAddress = cache(getSessionWalletAddress);
