import {
  BotIcon,
  NetworkIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
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
  activeAgentCount,
  activeDelegationCount,
  delegatedNativeEthAllowance,
}: {
  employeeCount: number;
  activeAgentCount: number;
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
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>AI Agents</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {activeAgentCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <BotIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
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
      </Card>

      <Card size="sm" className="@container/card">
        <CardHeader>
          <CardDescription>Delegated native ETH</CardDescription>
          <CardTitle className="text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
            {delegatedNativeEthAllowance} ETH
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="px-1 py-0">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
            </Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </div>
  );
}
