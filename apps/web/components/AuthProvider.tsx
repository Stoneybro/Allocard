"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useWeb3Auth, useWeb3AuthConnect } from "@web3auth/modal/react";
import { useAccount, useDisconnect, useReconnect } from "wagmi";

// ── Types ───────────────────────────────────────────────────────────────────

export type AuthState =
  | { status: "initializing"; elapsed: number }
  | { status: "unauthenticated"; connect: () => void; connecting: boolean }
  | { status: "authenticated"; address: `0x${string}`; disconnect: () => void }
  | { status: "error"; message: string; retry: () => void };

const AuthContext = createContext<AuthState>({
  status: "initializing",
  elapsed: 0,
});

const INIT_TIMEOUT_MS = 15_000;
/** Grace period after Web3Auth init before we declare "unauthenticated".
 *  Wagmi needs time to reconnect after Web3Auth finishes. */
const WAGMI_RECONNECT_GRACE_MS = 2_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isInitialized, isInitializing } = useWeb3Auth();
  const { address, isConnected } = useAccount();
  const { connect, loading: connecting } = useWeb3AuthConnect();
  const { disconnect } = useDisconnect();
  const { reconnect } = useReconnect();

  const [initTimedOut, setInitTimedOut] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  /** Timestamp when Web3Auth first finished initializing */
  const initDoneAtRef = useRef<number | null>(null);
  const [showReconnecting, setShowReconnecting] = useState(false);

  // ── Init timeout ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isInitialized) {
      initDoneAtRef.current = Date.now();
      setShowReconnecting(true);
      reconnect();
      return;
    }

    const start = startTimeRef.current;
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(now - start);
      if (now - start >= INIT_TIMEOUT_MS) {
        setInitTimedOut(true);
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isInitialized]);

  // ── Clear reconnecting flag after grace period or when Wagmi connects ────
  useEffect(() => {
    if (!showReconnecting) return;
    if (isConnected && address) {
      setShowReconnecting(false);
      return;
    }

    const remaining =
      WAGMI_RECONNECT_GRACE_MS -
      (Date.now() - (initDoneAtRef.current ?? Date.now()));
    if (remaining <= 0) {
      setShowReconnecting(false);
      return;
    }

    const timer = setTimeout(() => setShowReconnecting(false), remaining);
    return () => clearTimeout(timer);
  }, [showReconnecting, isConnected, address]);

  const retry = useCallback(() => {
    setInitTimedOut(false);
    startTimeRef.current = Date.now();
    setElapsed(0);
    initDoneAtRef.current = null;
    setShowReconnecting(false);
    window.location.reload();
  }, []);

  const state: AuthState = useMemo(() => {
    if (initTimedOut && !isInitialized) {
      return {
        status: "error",
        message: `Wallet initialization timed out after ${INIT_TIMEOUT_MS / 1000}s.`,
        retry,
      };
    }

    if (!isInitialized) {
      return { status: "initializing", elapsed };
    }

    // Authenticated
    if (isConnected && address) {
      return { status: "authenticated", address, disconnect };
    }

    // Web3Auth is initialized but Wagmi hasn't reconnected yet.
    // Stay in "initializing" until the grace period expires.
    if (showReconnecting) {
      return { status: "initializing", elapsed };
    }

    // Truly unauthenticated
    return { status: "unauthenticated", connect, connecting };
  }, [
    isInitialized,
    isInitializing,
    initTimedOut,
    showReconnecting,
    isConnected,
    address,
    connect,
    connecting,
    disconnect,
    retry,
    elapsed,
  ]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
