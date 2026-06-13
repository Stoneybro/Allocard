"use client";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── ConnectRequiredCard ─────────────────────────────────────────────────────

export function ConnectRequiredCard({
  title = "Connect your wallet",
  description = "Authenticate with MetaMask Embedded Wallets to continue.",
}: {
  title?: string;
  description?: string;
}) {
  const auth = useAuth();

  if (auth.status === "initializing") {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Initializing wallet… ({(auth.elapsed / 1000).toFixed(1)}s)
            </p>
            <Button disabled>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              Loading…
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Connection Error</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-destructive">{auth.message}</p>
            <Button onClick={auth.retry}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (auth.status === "unauthenticated") {
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{description}</p>
            <Button onClick={auth.connect} disabled={auth.connecting}>
              {auth.connecting ? "Connecting..." : "Connect wallet"}
            </Button>
          </CardContent>
        </Card>
      </div>
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
