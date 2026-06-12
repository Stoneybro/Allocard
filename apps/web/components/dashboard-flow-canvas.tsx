"use client";

import {
  type DragEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  CheckIcon,
  CopyIcon,
  CreditCardIcon,
  EyeIcon,
  Settings2Icon,
  TerminalIcon,
  UserRoundIcon,
} from "lucide-react";

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

export type DelegationCanvasCompany = {
  id: string;
  name: string;
  smartAccountAddress: string | null;
  ethBalance?: string;
};

export type DelegationCanvasEmployee = {
  id: string;
  label: string;
  smartAccountAddress: string | null;
};

export type DelegationCanvasAgent = {
  id: string;
  name: string;
  smartAccountAddress: string | null;
  isPlaceholder?: boolean;
};

export type DelegationCanvasDelegation = {
  id: string;
  parentDelegationId: string | null;
  delegatorType: "company" | "user" | "agent";
  delegatorId: string;
  delegateeType: "user" | "agent";
  delegateeId: string | null;
  status: "pending_config" | "active" | "revoked";
  canvasPositionX: number;
  canvasPositionY: number;
  allowance?: string;
};

type DelegationNodeData = {
  delegationId?: string;
  title: string;
  subtitle: string;
  address?: string;
  balance?: string;
  balanceLabel?: string;
  status: "root" | "pending_config" | "active" | "revoked" | "available";
  kind: "master" | "employee" | "agent";
  isPlaceholder?: boolean;
  canConfigure?: boolean;
  onConfigure?: (delegationId: string) => void;
  onRevoke?: (delegationId: string) => void;
  onRemove?: (delegationId: string) => void;
};

function StatusBadge({
  status,
  isPlaceholder,
}: {
  status: DelegationNodeData["status"];
  isPlaceholder?: boolean;
}) {
  if (status === "root") {
    return <Badge variant="secondary">Master card</Badge>;
  }

  if (isPlaceholder) {
    return <Badge variant="outline">Demo</Badge>;
  }

  return (
    <Badge variant={status === "active" ? "secondary" : "outline"}>
      {status === "pending_config"
        ? "Pending Configuration"
        : status === "revoked"
          ? "Revoked"
          : status === "available"
            ? "Available"
            : "Active"}
    </Badge>
  );
}

function CopyAddressButton({ address, isMaster }: { address?: string; isMaster?: boolean }) {
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
              isMaster ? "text-primary-foreground/60 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
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

function DelegationNode({ data }: NodeProps<Node<DelegationNodeData>>) {
  const Icon =
    data.kind === "master"
      ? CreditCardIcon
      : data.kind === "employee"
        ? UserRoundIcon
        : TerminalIcon;

  const formattedAddress = data.address ? formatWalletAddress(data.address) : null;

  return (
    <div
      className={cn(
        "min-w-52 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
        data.kind === "master" &&
          "min-w-64 border-primary bg-primary text-primary-foreground",
        data.kind === "employee" && "border-chart-4/50 bg-chart-4/10",
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
                data.kind === "master" && "text-primary-foreground/70",
              )}
            >
              {data.subtitle}
            </div>
          </div>
        </div>
        <StatusBadge
          status={data.status}
          isPlaceholder={data.isPlaceholder}
        />
      </div>

      <div
        className={cn(
          "mt-3 flex items-center justify-between rounded-md border bg-background/70 px-3 py-1.5 font-mono text-xs text-muted-foreground",
          data.kind === "master" && "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground/80",
        )}
      >
        <span>{formattedAddress ?? "Address pending"}</span>
        <CopyAddressButton address={data.address} isMaster={data.kind === "master"} />
      </div>

      {data.balance !== undefined && (
        <div
          className={cn(
            "mt-2 flex items-center justify-between rounded-md px-3 py-1.5 text-xs",
            data.kind === "master"
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
            {data.onRemove && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRemove?.(data.delegationId!);
                }}
              >
                Remove
              </Button>
            )}
          </div>
        ) : data.status === "revoked" ? (
          <div className="mt-3 flex gap-2">
            <Badge variant="destructive">Revoked</Badge>
            {data.onRemove && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRemove?.(data.delegationId!);
                }}
              >
                Remove
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <Badge variant="outline">Pending</Badge>
            {data.onRemove && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onRemove?.(data.delegationId!);
                }}
              >
                Remove
              </Button>
            )}
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

function statusEdgeStyle(status: DelegationCanvasDelegation["status"]) {
  if (status === "active") {
    return {
      stroke: "var(--foreground)",
      strokeWidth: 2,
    };
  }

  if (status === "revoked") {
    return {
      stroke: "var(--muted-foreground)",
      strokeWidth: 2,
      opacity: 0.2,
    };
  }

  return {
    stroke: "var(--muted-foreground)",
    strokeWidth: 2,
    strokeDasharray: "6 6",
    opacity: 0.34,
  };
}

function buildDelegateeNodeId(delegation: DelegationCanvasDelegation) {
  if (delegation.delegateeType === "agent") {
    return `agent-delegation:${delegation.id}`;
  }

  return `${delegation.delegateeType}:${delegation.delegateeId}`;
}

function buildDelegatorNodeId(delegation: DelegationCanvasDelegation) {
  if (delegation.delegatorType === "company") {
    return "company:root";
  }

  return `${delegation.delegatorType}:${delegation.delegatorId}`;
}

export function DashboardFlowCanvas({
  company,
  employees,
  agents,
  delegations,
  headerAction,
  onConfigureDelegation,
  onDropEmployee,
  onDropAgent,
  onMoveDelegation,
  onRevokeDelegation,
  onRemoveDelegation,
}: {
  company: DelegationCanvasCompany;
  employees: DelegationCanvasEmployee[];
  agents?: DelegationCanvasAgent[];
  delegations: DelegationCanvasDelegation[];
  headerAction?: ReactNode;
  onConfigureDelegation?: (delegationId: string) => void;
  onDropEmployee?: (input: {
    employeeId: string;
    canvasPositionX: number;
    canvasPositionY: number;
  }) => void;
  onDropAgent?: (input: {
    agentId: string;
    canvasPositionX: number;
    canvasPositionY: number;
  }) => void;
  onMoveDelegation?: (input: {
    delegationId: string;
    canvasPositionX: number;
    canvasPositionY: number;
  }) => void;
  onRevokeDelegation?: (delegationId: string) => void;
  onRemoveDelegation?: (delegationId: string) => void;
}) {
  const nodeTypes = useMemo(() => ({ delegation: DelegationNode }), []);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { nodes: derivedNodes, edges: derivedEdges } = useMemo(() => {
    const delegationByDelegatee = new Map<string, DelegationCanvasDelegation>();
    const nextNodes: Node<DelegationNodeData>[] = [
      {
        id: "company:root",
        type: "delegation",
        position: { x: 0, y: 0 },
        data: {
          title: company.name,
          subtitle: "Company smart account",
          address: company.smartAccountAddress ?? undefined,
          balance: company.ethBalance !== undefined ? `${company.ethBalance} ETH` : undefined,
          balanceLabel: "Balance",
          status: "root",
          kind: "master",
        },
      },
    ];

    for (const delegation of delegations) {
      delegationByDelegatee.set(buildDelegateeNodeId(delegation), delegation);
    }

    employees.forEach((employee) => {
      const nodeId = `user:${employee.id}`;
      const delegation = delegationByDelegatee.get(nodeId);

      if (!delegation) {
        return;
      }

      nextNodes.push({
        id: nodeId,
        type: "delegation",
        position: { x: 0, y: 0 },
        data: {
          delegationId: delegation.id,
          title: employee.label,
          subtitle: "Smart account",
          address: employee.smartAccountAddress ?? undefined,
          balance:
            delegation.status === "active" && delegation.allowance !== undefined
              ? `${delegation.allowance} ETH`
              : undefined,
          balanceLabel: delegation.status === "active" ? "Spending limit" : undefined,
          status: delegation.status,
          kind: "employee",
          canConfigure: true,
          onConfigure: onConfigureDelegation,
          onRevoke: onRevokeDelegation,
          onRemove: onRemoveDelegation,
        },
      });
    });

    const agentById = new Map((agents ?? []).map((agent) => [agent.id, agent]));

    delegations
      .filter((delegation) => delegation.delegateeType === "agent")
      .forEach((delegation) => {
        const agent = delegation.delegateeId ? agentById.get(delegation.delegateeId) : undefined;

        if (!agent) return;

        const nodeId = buildDelegateeNodeId(delegation);

        nextNodes.push({
          id: nodeId,
        type: "delegation",
        position: { x: 0, y: 0 },
        data: {
          delegationId: delegation.id,
          title: agent.name,
          subtitle: delegation.parentDelegationId ? "AI Agent · Redelegated" : "AI Agent",
          address: agent.smartAccountAddress ?? undefined,
          status: delegation.status,
          kind: "agent",
          isPlaceholder: agent.isPlaceholder,
          canConfigure: true,
          onConfigure: onConfigureDelegation,
          onRevoke: onRevokeDelegation,
          onRemove: onRemoveDelegation,
        },
      });
    });

    const nextEdges = delegations.reduce<Edge[]>((edges, delegation) => {
        const source = buildDelegatorNodeId(delegation);
        const target = buildDelegateeNodeId(delegation);

        if (
          !nextNodes.some((node) => node.id === source) ||
          !nextNodes.some((node) => node.id === target)
        ) {
          return edges;
        }

        edges.push({
          id: delegation.id,
          source,
          target,
          type: "straight",
          animated: delegation.status === "active",
          style: statusEdgeStyle(delegation.status),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "var(--foreground)",
          },
        });

        return edges;
      }, []);

    return { nodes: nextNodes, edges: nextEdges };
  }, [company, agents, delegations, employees, onConfigureDelegation, onRevokeDelegation, onRemoveDelegation]);

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

      const employeeId = event.dataTransfer.getData(
        "application/allocard-employee-id",
      );
      const agentId = event.dataTransfer.getData(
        "application/allocard-agent-id",
      );

      if (!canvasRef.current) return;
      const bounds = canvasRef.current.getBoundingClientRect();
      const canvasPositionX = event.clientX - bounds.left;
      const canvasPositionY = event.clientY - bounds.top;

      if (employeeId) {
        onDropEmployee?.({ employeeId, canvasPositionX, canvasPositionY });
      } else if (agentId) {
        onDropAgent?.({ agentId, canvasPositionX, canvasPositionY });
      }
    },
    [onDropEmployee, onDropAgent],
  );

  return (
    <div className="flex h-[620px] min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              DELEGATION CANVAS
            </p>
            <h3 className="mt-1 text-base font-semibold text-card-foreground">
              Company delegation tree
            </h3>
          </div>
        </div>
        <div className="flex items-center">
          {headerAction}
        </div>
      </div>

      <div
        ref={canvasRef}
        className="min-h-0 flex-1"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDrop={handleDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
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
          className="bg-[radial-gradient(circle_at_1px_1px,_rgba(148,163,184,0.22)_1px,_transparent_0)] bg-[size:22px_22px]"
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{
            type: "straight",
          }}
        >
          <Background gap={22} size={1} color="rgba(148,163,184,0.18)" />
          <Controls
            showInteractive={false}
            className="!bottom-5 !left-5 !top-auto !border-border !bg-background/90 !shadow-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
