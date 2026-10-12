import {
  ShieldCheckIcon,
  TrendingDownIcon,
  WalletIcon,
  BotIcon,
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
  approvedLimitEth,
  redelegatedEth,
  remainingEth,
  spentEth = "0",
}: {
  approvedLimitEth: string;
  redelegatedEth: string;
  remainingEth: string;
  spentEth?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Available Corporate Allowance */}
      <Card size="sm" className="@container/card border-border/80 bg-card shadow-xs">
        <CardHeader>
          <CardDescription className="text-xs font-medium text-muted-foreground">
            Available Allowance
          </CardDescription>
          <CardTitle className="text-xl font-bold tracking-tight tabular-nums @[250px]/card:text-2xl text-foreground">
            {remainingEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">
              <ShieldCheckIcon className="h-3.5 w-3.5 text-foreground" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Corporate funds available for direct spend or agent tasks.
        </p>
      </Card>

      {/* 2. Total Approved Cap */}
      <Card size="sm" className="@container/card border-border/80 bg-card shadow-xs">
        <CardHeader>
          <CardDescription className="text-xs font-medium text-muted-foreground">
            Authorized Spending Limit
          </CardDescription>
          <CardTitle className="text-xl font-bold tracking-tight tabular-nums @[250px]/card:text-2xl text-foreground">
            {approvedLimitEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
              <WalletIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Maximum allowance granted by your employer.
        </p>
      </Card>

      {/* 3. Utilized Spend */}
      <Card size="sm" className="@container/card border-border/80 bg-card shadow-xs">
        <CardHeader>
          <CardDescription className="text-xs font-medium text-muted-foreground">
            Utilized Spend
          </CardDescription>
          <CardTitle className="text-xl font-bold tracking-tight tabular-nums @[250px]/card:text-2xl text-foreground">
            {spentEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
              <TrendingDownIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Total business spend executed through your card.
        </p>
      </Card>

      {/* 4. Allocated to Agents */}
      <Card size="sm" className="@container/card border-border/80 bg-card shadow-xs">
        <CardHeader>
          <CardDescription className="text-xs font-medium text-muted-foreground">
            Allocated to Agents
          </CardDescription>
          <CardTitle className="text-xl font-bold tracking-tight tabular-nums @[250px]/card:text-2xl text-foreground">
            {redelegatedEth} {TOKEN_SYMBOL}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
              <BotIcon className="h-3.5 w-3.5 text-muted-foreground" />
            </Badge>
          </CardAction>
        </CardHeader>
        <p className="px-4 text-[11px] text-muted-foreground">
          Allowance currently assigned to autonomous AI agents.
        </p>
      </Card>
    </div>
  );
}
