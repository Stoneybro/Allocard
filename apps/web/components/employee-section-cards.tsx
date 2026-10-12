import {
  ShieldCheckIcon,
  TrendingDownIcon,
  WalletIcon,
  CoinsIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TOKEN_SYMBOL } from "@/lib/chain";

export function EmployeeSectionCards({
  smartAccountBalanceEth,
  approvedLimitEth,
  redelegatedEth,
  remainingEth,
}: {
  smartAccountBalanceEth: string;
  approvedLimitEth: string;
  redelegatedEth: string;
  remainingEth: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:grid-cols-4 dark:*:data-[slot=card]:bg-card">
      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Smart Account Balance</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {smartAccountBalanceEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <CoinsIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Current balance in your smart account.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Remaining Delegated Balance</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {remainingEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Delegated {TOKEN_SYMBOL} available to spend or assign to agents.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Approved delegated balance</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {approvedLimitEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <WalletIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Total {TOKEN_SYMBOL} delegated to you by the company.
        </p>
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Redelegated</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {redelegatedEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <TrendingDownIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          {TOKEN_SYMBOL} you have delegated to AI agents.
        </p>
      </Card>
    </div>
  );
}
