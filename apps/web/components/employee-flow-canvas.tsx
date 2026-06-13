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
  PlaneIcon,
  ReceiptIcon,
  Settings2Icon,
  ShoppingCartIcon,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

function CopyAddressButton({ address, dark }: { address?: string; dark?: boolean }) {
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
            className={cn(
              "inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-white/10",
              dark ? "text-neutral-400 hover:text-neutral-200" : "text-neutral-400 hover:text-neutral-600",
            )}
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

function agentActionLabel(agentTitle: string): { label: string; Icon: React.ElementType } {
  if (agentTitle === "Travel Agent") return { label: "Book Trip", Icon: PlaneIcon };
  if (agentTitle === "Procurement Agent") return { label: "Procure", Icon: ShoppingCartIcon };
  if (agentTitle === "Reimbursement Agent") return { label: "Claim", Icon: ReceiptIcon };
  return { label: "Open", Icon: BotIcon };
}

function EmployeeNode({ data }: NodeProps<Node<EmployeeNodeData>>) {
  const Icon = data.kind === "self" ? UserRoundIcon : BotIcon;
  const formattedAddress = data.address ? formatWalletAddress(data.address) : null;
  const isSelf = data.kind === "self";
  const isRevoked = data.status === "revoked";

  return (
    <div
      className={cn(
        "w-64 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm",
        !isSelf && !isRevoked && "w-72",
        isSelf && "border-neutral-800 bg-neutral-900 text-neutral-50",
        isRevoked && "w-64 opacity-55",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!size-2.5",
          isSelf ? "!bg-neutral-50 !border-neutral-400" : "!bg-neutral-400 !border-neutral-200",
        )}
      />
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 size-4 shrink-0", isSelf ? "text-neutral-300" : "text-neutral-400")} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{data.title}</div>
          <div
            className={cn(
              "truncate text-xs",
              isSelf ? "text-neutral-400" : "text-neutral-500",
            )}
          >
            {data.subtitle}
          </div>
        </div>
        <StatusBadge status={data.status} isRoot={isSelf} />
      </div>

      <div
        className={cn(
          "mt-3 flex items-center justify-between rounded-md border px-2.5 py-1.5 font-mono text-xs",
          isSelf
            ? "border-neutral-700 bg-neutral-800/50 text-neutral-300"
            : "border-neutral-100 bg-neutral-50 text-neutral-500",
        )}
      >
        <span className="truncate">{formattedAddress ?? "Address pending"}</span>
        <CopyAddressButton address={data.address} dark={isSelf} />
      </div>

      {data.balance !== undefined && (
        <div
          className={cn(
            "mt-2 flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs",
            isSelf
              ? "bg-neutral-800/40 text-neutral-200"
              : "bg-neutral-50 text-neutral-600",
          )}
        >
          <span className="font-medium">{data.balanceLabel ?? "Balance"}</span>
          <span className="font-mono font-semibold">{data.balance}</span>
        </div>
      )}

      {data.canConfigure && data.delegationId ? (
        data.status === "revoked" ? (
          <div className="nodrag mt-3" onMouseDown={e => e.stopPropagation()}>
            <Badge variant="destructive">Revoked</Badge>
          </div>
        ) : data.status === "pending_config" ? (
          /* Pending agent: Configure + Remove */
          <div className="nodrag mt-3 flex gap-2" onMouseDown={e => e.stopPropagation()}>
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove pending delegation?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will discard your pending configuration. You will need to start over if you want to configure this delegation again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => data.onRevoke?.(data.delegationId!)}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        ) : (
          /* Active agent: action-specific label + Revoke */
          (() => {
            const { label, Icon } = agentActionLabel(data.title);
            return (
              <div className="nodrag mt-3 flex gap-2" onMouseDown={e => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onConfigure?.(data.delegationId!);
                  }}
                >
                  <Icon className="mr-1 size-3" />
                  {label}
                </Button>
                {data.onRevoke && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently revoke the active delegation on-chain.
                          If this is an employee delegation, all child AI agents will also lose spending authority immediately.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => data.onRevoke?.(data.delegationId!)}
                          className="bg-red-600 text-white hover:bg-red-700"
                        >
                          Yes, revoke delegation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            );
          })()
        )
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className={cn(
          "!size-2.5",
          isSelf ? "!bg-neutral-50 !border-neutral-400" : "!bg-neutral-400 !border-neutral-200",
        )}
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
          ? { stroke: "#404040", strokeWidth: 2 }
          : {
              stroke: "#a3a3a3",
              strokeWidth: 1.5,
              strokeDasharray: "5 4",
              opacity: 0.5,
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
      className="flex h-[560px] min-h-[460px] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-400">
            DELEGATION CANVAS
          </p>
          <h3 className="mt-1 text-base font-semibold text-neutral-800">
            Your spending authority
          </h3>
        </div>
        <div className="flex items-center">{headerAction}</div>
      </div>

      <div className="min-h-0 flex-1 bg-neutral-50">
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
        >
          <Background gap={22} size={1} color="#d4d4d4" />
          <Controls
            showInteractive={false}
            className="!bottom-4 !left-4 !top-auto !border-neutral-200 !bg-white/90 !shadow-sm"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
