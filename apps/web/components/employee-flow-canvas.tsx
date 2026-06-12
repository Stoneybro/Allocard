"use client";

import { type DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEther } from 'viem';
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
  type NodeProps,
} from "@xyflow/react";
import {
  BotIcon,
  CheckIcon,
  CopyIcon,
  EyeIcon,
  Settings2Icon,
  UserRoundIcon,
} from "lucide-react";

import type { EmployeeDashboardState } from "@/app/actions/identity";
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
import { layoutTree } from "@/lib/layoutTree";

type EmployeeNodeData = {
  delegationId?: string;
  agentId?: string;
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
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <Icon className="size-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{copied ? "Copied!" : "Copy address"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

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

      <div
        className={cn(
          "mt-3 flex items-center justify-between rounded-md border bg-background/70 px-3 py-1.5 font-mono text-xs text-muted-foreground",
          data.kind === "self" && "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/80",
        )}
      >
        <span>{formattedAddress ?? "Address pending"}</span>
        <CopyAddressButton address={data.address} />
      </div>

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

      {data.canConfigure && data.delegationId ? (
        data.status === "active" ? (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                data.onConfigure?.(data.delegationId!);
              }}
            >
              <Settings2Icon className="mr-1 size-3" />
              Configure
            </Button>
            {data.onRevoke && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRevoke?.(data.delegationId!);
                }}
              >
                Revoke
              </Button>
            )}
          </div>
        ) : data.status === "revoked" ? (
          <div className="mt-3">
            <Badge variant="destructive">Revoked</Badge>
          </div>
        ) : (
          <div className="mt-3">
            <Badge variant="outline">Pending Configuration</Badge>
          </div>
        )
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="!border-border !bg-background"
      />
    </div>
  );
}

export function EmployeeFlowCanvas({
  dashboardState,
  onConfigureDelegation,
  onRevokeDelegation,
  onNodeClick,
  onDropAgent,
  headerAction,
}: {
  dashboardState: EmployeeDashboardState;
  onConfigureDelegation?: (delegationId: string) => void;
  onRevokeDelegation?: (delegationId: string) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node) => void;
  onDropAgent?: (input: {
    agentId: string;
    canvasPositionX: number;
    canvasPositionY: number;
  }) => void;
  headerAction?: React.ReactNode;
}) {
  const nodeTypes = useMemo(() => ({ employeeNode: EmployeeNode }), []);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const { employee, company, inboundDelegation, outboundDelegations, agents } = dashboardState;
  const approvedLimitEth = dashboardState.summary.approvedLimitEth;

  const { nodes: derivedNodes, edges: derivedEdges } = useMemo(() => {
    const selfNodeId = `employee:${employee.id}`;
    const agentById = new Map(agents.map((agent) => [agent.id, agent]));

    const nextNodes: Node<EmployeeNodeData>[] = [
      {
        id: selfNodeId,
        type: "employeeNode",
        position: { x: 0, y: 0 },
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

    outboundDelegations.forEach((delegation) => {
      const agentNodeId = `agent:${delegation.id}`;
      const agent = delegation.delegateeId ? agentById.get(delegation.delegateeId) : undefined;

      nextNodes.push({
        id: agentNodeId,
        type: "employeeNode",
        position: { x: 0, y: 0 },
        data: {
          delegationId: delegation.id,
          agentId: delegation.delegateeId ?? undefined,
          title: agent?.name ?? "AI Agent",
          subtitle: agent?.description ?? "Delegated AI agent",
          address: agent?.smartAccountAddress ?? undefined,
          balance:
            delegation.status === "active"
              ? (() => {
                  const caveat = delegation.caveats?.find(
                    (c: { caveatType: string }) => c.caveatType === "nativeTokenTransferAmount",
                  );
                  if (!caveat) return undefined;
                  const value = caveat.caveatValue as Record<string, unknown>;
                  const wei = String(value.maxAmount ?? value.amount ?? "");
                  if (!wei || wei === "undefined") return undefined;
                  try {
                    return `${formatEther(BigInt(wei))} ETH`;
                  } catch {
                    return undefined;
                  }
                })()
              : undefined,
          balanceLabel: delegation.status === "active" ? "Spending limit" : undefined,
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
        type: "straight",
        animated: isActive,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: isActive
          ? { stroke: "var(--foreground)", strokeWidth: 2 }
          : {
              stroke: "var(--muted-foreground)",
              strokeWidth: 2,
              strokeDasharray: "6 6",
              opacity: 0.34,
            },
      });
    });

    return { nodes: nextNodes, edges: nextEdges };
  }, [
    employee,
    company,
    inboundDelegation,
    approvedLimitEth,
    outboundDelegations,
    agents,
    onConfigureDelegation,
    onRevokeDelegation,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(derivedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedEdges);

  useEffect(() => {
    setNodes((prevNodes) => {
      const measuredMap = new Map(
        prevNodes.map((n) => [n.id, n.measured as { width?: number; height?: number } | undefined])
      );
      const merged = derivedNodes.map((node) => ({
        ...node,
        measured: measuredMap.get(node.id) ?? node.measured,
      }));
      return layoutTree(merged, derivedEdges);
    });
    setEdges(derivedEdges);
  }, [derivedNodes, derivedEdges, setNodes, setEdges]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const agentId = event.dataTransfer.getData("application/allocard-agent-id");
      if (!agentId || !canvasRef.current) return;

      const bounds = canvasRef.current.getBoundingClientRect();
      onDropAgent?.({
        agentId,
        canvasPositionX: event.clientX - bounds.left,
        canvasPositionY: event.clientY - bounds.top,
      });
    },
    [onDropAgent],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div
      ref={canvasRef}
      className="flex h-[560px] min-h-[460px] flex-col overflow-hidden rounded-lg border bg-card shadow-sm"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            DELEGATION CANVAS
          </p>
          <h3 className="mt-1 text-base font-semibold text-card-foreground">
            Your spending authority
          </h3>
        </div>
        <div className="flex items-center">{headerAction}</div>
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
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
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
