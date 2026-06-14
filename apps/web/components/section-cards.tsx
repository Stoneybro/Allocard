import {
  NetworkIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SectionCards({
  employeeCount,
  smartAccountBalance,
  activeDelegationCount,
  delegatedNativeEthAllowance,
}: {
  employeeCount: number;
  smartAccountBalance: string;
  activeDelegationCount: number;
  delegatedNativeEthAllowance: string;
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
          <CardDescription>Smart Account Balance</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {smartAccountBalance} ETH
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <WalletIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Current balance of the company smart account.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Active delegations</CardDescription>
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
          Total employees and AI agents with active delegations.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Delegated ETH</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {delegatedNativeEthAllowance} ETH
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Amount delegated to employees and agents.
        </p>
      </Card>
    </div>
  );
}
