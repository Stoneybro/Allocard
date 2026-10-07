"use client";

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

// ── Types ───────────────────────────────────────────────────────────────────

export type AuthState =
  | { status: "connecting" }
  | { status: "unauthenticated"; connect: () => void; connecting: boolean }
  | { status: "authenticated"; address: `0x${string}`; disconnect: () => void };

const AuthContext = createContext<AuthState>({ status: "connecting" });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, isReconnecting, isConnecting } = useAccount();
  const { connect, isPending: connectPending } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = useCallback(() => {
    connect({ connector: injected() });
  }, [connect]);

  const state: AuthState = useMemo(() => {
    // Wagmi is attempting to restore a previous session on mount.
    if (isReconnecting || isConnecting) {
      return { status: "connecting" };
    }

    if (isConnected && address) {
      return { status: "authenticated", address, disconnect };
    }

    return {
      status: "unauthenticated",
      connect: handleConnect,
      connecting: connectPending,
    };
  }, [isReconnecting, isConnecting, isConnected, address, disconnect, handleConnect, connectPending]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
