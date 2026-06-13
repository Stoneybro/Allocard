"use client";

import { useAuth } from "@/components/AuthProvider";

// ── Shared layout wrapper ────────────────────────────────────────────────────

function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center p-6 bg-white">
      <div className="flex flex-col items-center text-center gap-6 w-full max-w-sm">
        {children}
      </div>
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin text-[#999]"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        d="M12 2a10 10 0 0 1 10 10"
        className="opacity-100"
      />
      <path
        strokeLinecap="round"
        d="M12 2a10 10 0 0 0-10 10"
        className="opacity-20"
      />
    </svg>
  );
}

// ── ConnectRequiredCard ──────────────────────────────────────────────────────

export function ConnectRequiredCard({
  title = "Connect your wallet",
  description = "Sign in with MetaMask to continue.",
}: {
  title?: string;
  description?: string;
}) {
  const auth = useAuth();

  if (auth.status === "initializing") {
    return (
      <AuthScreen>
        <Spinner />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-[#111]">Initializing wallet</p>
          <p className="text-xs text-[#999]">
            {(auth.elapsed / 1000).toFixed(1)}s elapsed
          </p>
        </div>
      </AuthScreen>
    );
  }

  if (auth.status === "error") {
    return (
      <AuthScreen>
        <div className="w-10 h-10 rounded-full border border-[#eaeaea] flex items-center justify-center text-[#999]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-[#111]">Connection failed</p>
          <p className="text-xs text-[#666] leading-relaxed">{auth.message}</p>
        </div>
        <button
          onClick={auth.retry}
          className="h-9 px-5 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors cursor-pointer"
        >
          Retry
        </button>
      </AuthScreen>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <AuthScreen>
        <div className="w-10 h-10 rounded-full border border-[#eaeaea] flex items-center justify-center">
          <span className="text-sm font-bold text-[#111]">A</span>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-[#111]">{title}</p>
          <p className="text-xs text-[#666]">{description}</p>
        </div>
        <button
          onClick={auth.connect}
          disabled={auth.connecting}
          className="h-9 px-5 rounded-md bg-[#111] text-white text-sm font-medium hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-2"
        >
          {auth.connecting && <Spinner />}
          {auth.connecting ? "Connecting..." : "Connect wallet"}
        </button>
      </AuthScreen>
    );
  }

  return null;
}

// ── useConnectedWalletAddress (legacy compat — thin wrapper over useAuth) ────

/**
 * @deprecated Prefer useAuth() directly. This wrapper exists for gradual migration.
 */
export function useConnectedWalletAddress() {
  const auth = useAuth();

  if (auth.status === "authenticated") {
    return {
      address: auth.address,
      isConnected: true,
      isAuthLoading: false,
      shouldPromptConnect: false,
    };
  }

  if (auth.status === "error") {
    return {
      address: undefined,
      isConnected: false,
      isAuthLoading: false,
      shouldPromptConnect: false,
    };
  }

  return {
    address: undefined,
    isConnected: false,
    isAuthLoading: auth.status === "initializing",
    shouldPromptConnect: auth.status === "unauthenticated",
  };
}
