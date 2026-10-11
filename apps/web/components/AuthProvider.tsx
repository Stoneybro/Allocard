"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";
import { clearSession, createSession, type SessionIdentity } from "@/lib/session-client";

export type AuthState =
  | { status: "connecting" }
  | { status: "unauthenticated"; connect: () => void; connecting: boolean }
  | { status: "authenticated"; address: `0x${string}`; email: string | null; disconnect: () => void; establishSession: () => Promise<SessionIdentity> };

const AuthContext = createContext<AuthState>({ status: "connecting" });
const SESSION_REFRESH_AFTER_MS = 23 * 60 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  // The embedded Privy wallet is Allocard's signing identity. External wallets
  // may be linked to Privy, but they must never silently become the app identity.
  const wallet = wallets.find((candidate) => candidate.walletClientType === "privy");
  const [sessionIdentity, setSessionIdentity] = useState<SessionIdentity | null>(null);
  const sessionIdentityRef = useRef<SessionIdentity | null>(null);
  const sessionCreatedAtRef = useRef(0);
  const sessionRequest = useRef<Promise<SessionIdentity> | null>(null);
  const walletsRef = useRef(wallets);
  const setActiveWalletRef = useRef(setActiveWallet);
  const getAccessTokenRef = useRef(getAccessToken);
  walletsRef.current = wallets;
  setActiveWalletRef.current = setActiveWallet;
  getAccessTokenRef.current = getAccessToken;
  sessionIdentityRef.current = sessionIdentity;

  const connect = useCallback(() => { void login(); }, [login]);
  const establishSession = useCallback(async () => {
    const cachedIdentity = sessionIdentityRef.current;
    if (
      cachedIdentity &&
      cachedIdentity.providerUserId === user?.id &&
      Date.now() - sessionCreatedAtRef.current < SESSION_REFRESH_AFTER_MS
    ) return cachedIdentity;
    if (sessionRequest.current) return sessionRequest.current;
    const request = (async () => {
      const accessToken = await getAccessTokenRef.current();
      if (!accessToken) throw new Error("Your sign-in session expired. Please sign in again.");
      const identity = await createSession(accessToken);
      const signingWallet = walletsRef.current.find((candidate) =>
        candidate.walletClientType === "privy" &&
        candidate.address.toLowerCase() === identity.walletAddress.toLowerCase(),
      );
      if (!signingWallet) throw new Error("Your embedded wallet is still syncing. Please retry in a moment.");
      await setActiveWalletRef.current(signingWallet);
      sessionCreatedAtRef.current = Date.now();
      setSessionIdentity(identity);
      return identity;
    })();
    sessionRequest.current = request;
    try {
      return await request;
    } finally {
      if (sessionRequest.current === request) sessionRequest.current = null;
    }
  }, [user?.id]);
  const disconnect = useCallback(async () => {
    // Let a login request finish before clearing its cookie so a late response
    // cannot recreate the session after logout.
    await sessionRequest.current?.catch(() => undefined);
    try {
      await clearSession();
    } finally {
      sessionIdentityRef.current = null;
      sessionCreatedAtRef.current = 0;
      setSessionIdentity(null);
      await logout();
    }
  }, [logout]);

  // Establish the server session as soon as Privy has finished login and its
  // embedded wallet is available. Pages can safely retry through the same
  // deduplicated function if they need the session during navigation.
  useEffect(() => {
    if (!ready || !authenticated || !walletsReady || !wallet) return;
    void establishSession().catch(() => {
      // Protected actions surface a useful recovery message if session setup
      // fails; suppress an unhandled rejection from this background sync.
    });
  }, [ready, authenticated, walletsReady, wallet?.address, establishSession]);

  const state: AuthState = useMemo(() => {
    if (!ready || (authenticated && (!walletsReady || !wallet || sessionIdentity?.providerUserId !== user?.id))) {
      return { status: "connecting" };
    }
    if (authenticated && sessionIdentity) {
      return {
        status: "authenticated",
        address: sessionIdentity.walletAddress,
        email: sessionIdentity.email,
        disconnect,
        establishSession,
      };
    }
    return { status: "unauthenticated", connect, connecting: false };
  }, [ready, authenticated, walletsReady, wallet?.address, user?.id, sessionIdentity, disconnect, establishSession, connect]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
