"use server";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { PrivyClient, verifyAccessToken } from "@privy-io/node";
import { cache } from "react";

const SESSION_COOKIE_NAME = "allocard_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24;

export type SessionIdentity = {
  providerUserId: string;
  email: string;
  walletAddress: `0x${string}`;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return new TextEncoder().encode(secret);
}

function getPrivyConfig() {
  const appId = process.env.PRIVY_APP_ID;
  const appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret) throw new Error("PRIVY_APP_ID and PRIVY_APP_SECRET must be configured");
  return { appId, appSecret };
}

export async function createSession(accessToken: string) {
  const { appId, appSecret } = getPrivyConfig();
  if (!accessToken || accessToken.length > 8192) throw new Error("A valid Privy access token is required");

  const privy = new PrivyClient({ appId, appSecret });
  const app = await privy.apps().get(appId);
  const claims = await verifyAccessToken({
    access_token: accessToken,
    app_id: appId,
    verification_key: app.verification_key,
  });
  const user = await privy.users()._get(claims.user_id);
  if (user.id !== claims.user_id) throw new Error("Privy identity could not be verified");

  const emailAccount = user.linked_accounts.find((account) =>
    account.type === "email" || account.type === "google_oauth",
  );
  const email = emailAccount?.type === "email"
    ? emailAccount.address
    : emailAccount?.type === "google_oauth"
      ? emailAccount.email
      : null;
  if (!email || !emailAccount?.verified_at) throw new Error("Sign in with a verified email address to continue");

  const wallet = user.linked_accounts.find((account) =>
    account.type === "wallet" &&
    account.chain_type === "ethereum" &&
    "wallet_client" in account &&
    account.wallet_client === "privy",
  );
  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet.address)) {
    throw new Error("Your embedded wallet is still being prepared. Please try again shortly");
  }

  const identity: SessionIdentity = {
    providerUserId: user.id,
    email: email.trim().toLowerCase(),
    walletAddress: wallet.address.toLowerCase() as `0x${string}`,
  };
  const token = await new SignJWT(identity)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.providerUserId)
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
  return identity;
}

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.walletAddress !== "string") return null;
    if (!/^0x[a-fA-F0-9]{40}$/.test(payload.walletAddress)) return null;
    return {
      providerUserId: payload.sub,
      email: payload.email,
      walletAddress: payload.walletAddress.toLowerCase() as `0x${string}`,
    };
  } catch {
    return null;
  }
}

export async function getSessionWalletAddress(): Promise<string | null> {
  return (await getSessionIdentity())?.walletAddress ?? null;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export const getCachedSessionWalletAddress = cache(getSessionWalletAddress);
export const getCachedSessionIdentity = cache(getSessionIdentity);
