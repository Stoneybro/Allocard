"use client";

import { useAuth } from "@/components/AuthProvider";

import Link from "next/link";

// ── Shared layout wrapper ────────────────────────────────────────────────────

function AuthScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center p-8 bg-white">
      <div className="flex flex-col items-center text-center gap-8 w-full max-w-md">
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
      width="24"
      height="24"
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
        <div className="flex flex-col gap-2">
          <p className="text-xl font-bold text-[#111]">Initializing wallet</p>
          <p className="text-base text-[#999]">
            {(auth.elapsed / 1000).toFixed(1)}s elapsed
          </p>
        </div>
      </AuthScreen>
    );
  }

  if (auth.status === "error") {
    return (
      <AuthScreen>
        <div className="w-16 h-16 flex items-center justify-center mb-2">
          <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-full h-full object-contain opacity-50 grayscale" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-bold text-[#111]">Connection failed</p>
          <p className="text-base text-[#666] leading-relaxed">{auth.message}</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <button
            onClick={auth.retry}
            className="h-12 w-full rounded-md bg-[#111] text-white text-base font-semibold hover:bg-[#333] transition-colors cursor-pointer"
          >
            Retry
          </button>
          <Link href="/" className="h-12 w-full rounded-md border border-[#eaeaea] bg-white text-[#111] text-base font-semibold hover:bg-[#f5f5f5] transition-colors flex items-center justify-center">
            Return to Home Page
          </Link>
        </div>
      </AuthScreen>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <AuthScreen>
        <div className="w-16 h-16 flex items-center justify-center mb-2">
          <img src="/AllocardLogoBlack.svg" alt="Allocard Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-bold text-[#111]">{title}</p>
          <p className="text-base text-[#666]">{description}</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
          <button
            onClick={auth.connect}
            disabled={auth.connecting}
            className="h-12 w-full rounded-md bg-[#111] text-white text-base font-semibold hover:bg-[#333] transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-3"
          >
            {auth.connecting && <Spinner />}
            {auth.connecting ? "Connecting..." : "Connect wallet"}
          </button>
          <Link href="/" className="h-12 w-full rounded-md border border-[#eaeaea] bg-white text-[#111] text-base font-semibold hover:bg-[#f5f5f5] transition-colors flex items-center justify-center">
            Return to Home Page
          </Link>
        </div>
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
