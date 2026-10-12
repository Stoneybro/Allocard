import {
  NetworkIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  WalletIcon,
  PlusCircleIcon,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOKEN_SYMBOL } from "@/lib/chain";

export function SectionCards({
  employeeCount,
  smartAccountBalance,
  activeDelegationCount,
  delegatedNativeEthAllowance,
  onTopUp,
  isToppingUp,
}: {
  employeeCount: number;
  smartAccountBalance: string;
  activeDelegationCount: number;
  delegatedNativeEthAllowance: string;
  onTopUp?: () => void;
  isToppingUp?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Employees</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {employeeCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <UsersRoundIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Total onboarded team members.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Treasury Balance</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {smartAccountBalance} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            {onTopUp ? (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[11px] gap-1 px-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
                onClick={onTopUp}
                disabled={isToppingUp}
              >
                {isToppingUp ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <PlusCircleIcon className="h-3 w-3" />
                )}
                <span>+10k {TOKEN_SYMBOL}</span>
              </Button>
            ) : (
              <Badge variant="outline" className="px-1 py-0">
                <WalletIcon className="h-3.5 w-3.5" />
              </Badge>
            )}
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Corporate treasury balance on Monad Testnet.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Active Delegations</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {activeDelegationCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <NetworkIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Employees and AI agents with active allowances.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Budgeted {TOKEN_SYMBOL}</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {delegatedNativeEthAllowance} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Total amount budgeted to employees and agents.
        </p>
      </Card>
    </div>
  );
}
