"use client";

import { useWeb3AuthConnect } from "@web3auth/modal/react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ConnectRequiredCard({
  title = "Connect your wallet",
  description = "Authenticate with MetaMask Embedded Wallets to continue.",
}: {
  title?: string;
  description?: string;
}) {
  const { connect, loading } = useWeb3AuthConnect();

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <Button onClick={() => connect()} disabled={loading}>
            {loading ? "Connecting..." : "Connect wallet"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function useConnectedWalletAddress() {
  const { address, isConnected } = useAccount();

  return {
    address,
    isConnected: isConnected && Boolean(address),
  };
}
