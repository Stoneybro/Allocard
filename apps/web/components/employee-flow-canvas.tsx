"use client";

import { formatEther } from "viem";
import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  Settings2Icon,
  UserRoundIcon,
} from "lucide-react";
import { useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatWalletAddress } from "@/lib/wallet";
import type { EmployeeDashboardState } from "@/app/actions/identity";

// ── Types ────────────────────────────────────────────────────────────────────

type EmployeeNodeData = {
  delegationId?: string;
  title: string;
  subtitle: string;
  address?: string;
  balance?: string;
  balanceLabel?: string;
  status: "root" | "pending_config" | "active" | "revoked";
  kind: "self" | "agent";
  canConfigure?: boolean;
  onConfigure?: (delegationId: string) => void;
  onRevoke?: (delegationId: string) => void;
};

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isRoot }: { status: EmployeeNodeData["status"]; isRoot?: boolean }) {
  if (isRoot) return <Badge variant="secondary">Your Account</Badge>;

  return (
    <Badge variant={status === "active" ? "secondary" : "outline"}>
      {status === "pending_config"
        ? "Pending Config"
        : status === "revoked"
          ? "Revoked"
          : "Active"}
    </Badge>
  );
}

// ── Copy address button ───────────────────────────────────────────────────────

function CopyAddressButton({ address }: { address?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [address]);

  if (!address) return null;

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-white/10"
          >
            <Icon className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{copied ? "Copied!" : "Copy address"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Employee node component ───────────────────────────────────────────────────

import type { NodeProps } from "@xyflow/react";

function EmployeeNode({ data }: NodeProps<Node<EmployeeNodeData>>) {
  const Icon = data.kind === "self" ? UserRoundIcon : BotIcon;
  const formattedAddress = data.address ? formatWalletAddress(data.address) : null;

  return (
    <div
      className={cn(
        "min-w-52 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
        data.kind === "self" && "min-w-64 border-primary bg-primary text-primary-foreground",
        data.kind === "agent" && "border-chart-5/50 bg-chart-5/10",
        data.status === "revoked" && "opacity-55",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!border-border !bg-background"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{data.title}</div>
            <div
              className={cn(
                "truncate text-xs text-muted-foreground",
                data.kind === "self" && "text-primary-foreground/70",
              )}
            >
              {data.subtitle}
            </div>
          </div>
        </div>
        <StatusBadge status={data.status} isRoot={data.kind === "self"} />
      </div>

      {/* Address chip */}
      <div
        className={cn(
          "mt-3 flex items-center justify-between rounded-md border bg-background/70 px-3 py-1.5 font-mono text-xs text-muted-foreground",
          data.kind === "self" && "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/80",
        )}
      >
        <span>{formattedAddress ?? "Address pending"}</span>
        <CopyAddressButton address={data.address} />
      </div>

      {/* Balance row */}
      {data.balance !== undefined && (
        <div
          className={cn(
            "mt-2 flex items-center justify-between rounded-md px-3 py-1.5 text-xs",
            data.kind === "self"
              ? "bg-primary-foreground/10 text-primary-foreground/90"
              : "bg-muted/50 text-muted-foreground",
          )}
        >
          <span className="font-medium">{data.balanceLabel ?? "Balance"}</span>
          <span className="font-mono font-semibold">{data.balance}</span>
        </div>
      )}

      {/* Action buttons for agent nodes */}
      {data.canConfigure && data.delegationId ? (
        data.status === "active" ? (
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => data.onConfigure?.(data.delegationId as string)}
            >
              <EyeIcon data-icon="inline-start" />
              View Rules
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => data.onRevoke?.(data.delegationId as string)}
            >
              Revoke
            </Button>
          </div>
        ) : data.status !== "revoked" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => data.onConfigure?.(data.delegationId as string)}
          >
            <Settings2Icon data-icon="inline-start" />
            Configure
          </Button>
        ) : null
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="!border-border !bg-background"
      />
    </div>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────

export function EmployeeFlowCanvas({
  dashboardState,
  onConfigureDelegation,
  onRevokeDelegation,
  onNodeClick,
}: {
  dashboardState: EmployeeDashboardState;
  onConfigureDelegation?: (delegationId: string) => void;
  onRevokeDelegation?: (delegationId: string) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}) {
  const nodeTypes = useMemo(() => ({ employeeNode: EmployeeNode }), []);

  const { employee, company, inboundDelegation, outboundDelegations } = dashboardState;

  const approvedLimitEth = dashboardState.summary.approvedLimitEth;

  const { nodes: derivedNodes, edges: derivedEdges } = useMemo(() => {
    const selfNodeId = `employee:${employee.id}`;

    // Root: employee's own smart account
    const nextNodes: Node<EmployeeNodeData>[] = [
      {
        id: selfNodeId,
        type: "employeeNode",
        position: { x: 80, y: 180 },
        data: {
          title: formatWalletAddress(employee.walletAddress),
          subtitle: `Delegated by ${company.name}`,
          address: employee.smartAccountAddress ?? undefined,
          balance: inboundDelegation ? `${approvedLimitEth} ETH` : undefined,
          balanceLabel: "Approved limit",
          status: "root",
          kind: "self",
        },
      },
    ];

    const nextEdges: Edge[] = [];

    outboundDelegations.forEach((delegation, index) => {
      const agentNodeId = `agent:${delegation.delegateeId ?? delegation.id}`;

      nextNodes.push({
        id: agentNodeId,
        type: "employeeNode",
        position: { x: 420, y: 80 + index * 160 },
        data: {
          delegationId: delegation.id,
          title: "AI Agent",
          subtitle: delegation.delegateeId ?? "Agent smart account",
          address: undefined,
          balance: (() => {
            const caveat = delegation.caveats?.find(
              (c: { caveatType: string }) => c.caveatType === "nativeTokenTransferAmount",
            );
            if (!caveat) return undefined;
            const val = caveat.caveatValue as Record<string, unknown>;
            const weiStr = String(val.maxAmount ?? val.amount ?? "");
            if (!weiStr || weiStr === "undefined") return undefined;
            try {
              return `${formatEther(BigInt(weiStr))} ETH`;
            } catch {
              return undefined;
            }
          })(),
          balanceLabel: "Spending limit",
          status: delegation.status,
          kind: "agent",
          canConfigure: true,
          onConfigure: onConfigureDelegation,
          onRevoke: onRevokeDelegation,
        },
      });

      const isActive = delegation.status === "active";
      nextEdges.push({
        id: `edge:${delegation.id}`,
        source: selfNodeId,
        target: agentNodeId,
        type: "smoothstep",
        animated: isActive,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: isActive
          ? { stroke: "var(--foreground)", strokeWidth: 2 }
          : { stroke: "var(--muted-foreground)", strokeWidth: 2, strokeDasharray: "6 6", opacity: 0.34 },
      });
    });

    return { nodes: nextNodes, edges: nextEdges };
  }, [employee, company, inboundDelegation, approvedLimitEth, outboundDelegations, onConfigureDelegation, onRevokeDelegation]);

  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges);

  useEffect(() => {
    setNodes((prevNodes) => {
      const positionMap = new Map(prevNodes.map((n) => [n.id, n.position]));
      return derivedNodes.map((node) => {
        const currentPosition = positionMap.get(node.id);
        return currentPosition ? { ...node, position: currentPosition } : node;
      });
    });
    setEdges(derivedEdges);
  }, [derivedNodes, derivedEdges, setNodes, setEdges]);

  return (
    <div className="flex h-[560px] min-h-[460px] flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            DELEGATION CANVAS
          </p>
          <h3 className="mt-1 text-base font-semibold text-card-foreground">
            Your spending authority
          </h3>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag
          zoomOnScroll
          minZoom={0.55}
          maxZoom={1.5}
          colorMode="dark"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
