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
  CardFooter,
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
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:grid-cols-3 dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Team recipients</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {employeeCount + activeAgentCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <UsersRoundIcon />
              {employeeCount} employees
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {activeAgentCount} available agents <BotIcon />
          </div>
          <div className="text-muted-foreground">
            Recipients available from the sidebar
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active delegations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeDelegationCount}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <NetworkIcon />
              Live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Signed authority only <ShieldCheckIcon />
          </div>
          <div className="text-muted-foreground">
            Pending and revoked nodes remain visible on the canvas
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Delegated native ETH</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {delegatedNativeEthAllowance} ETH
          </CardTitle>
          <CardAction>
            <Badge variant="outline">Base Sepolia</Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Active caveat allowance <ShieldCheckIcon />
          </div>
          <div className="text-muted-foreground">
            Summed from native ETH delegation caveats
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
