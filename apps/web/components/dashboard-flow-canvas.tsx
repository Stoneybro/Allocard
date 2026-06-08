"use client";

import { type ReactNode, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  BotIcon,
  CircleDotIcon,
  CreditCardIcon,
  TerminalIcon,
  UserRoundIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatWalletAddress } from "@/lib/wallet";

export type DelegationCanvasCompany = {
  id: string;
  name: string;
  smartAccountAddress: string | null;
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
  delegateeType: "user" | "agent" | "eoa";
  delegateeId: string | null;
  delegateeAddress: string | null;
  delegateeLabel: string | null;
  status: "pending_config" | "active" | "revoked";
  canvasPositionX: number;
  canvasPositionY: number;
};

type DelegationNodeData = {
  title: string;
  subtitle: string;
  detail: string;
  status: "root" | "pending_config" | "active" | "revoked" | "available";
  kind: "master" | "employee" | "agent" | "eoa";
  isPlaceholder?: boolean;
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
        ? "Pending"
        : status === "revoked"
          ? "Revoked"
          : status === "available"
            ? "Available"
            : "Active"}
    </Badge>
  );
}

function DelegationNode({ data }: NodeProps<Node<DelegationNodeData>>) {
  const Icon =
    data.kind === "master"
      ? CreditCardIcon
      : data.kind === "employee"
        ? UserRoundIcon
        : data.kind === "agent"
          ? BotIcon
          : TerminalIcon;

  return (
    <div
      className={cn(
        "min-w-52 rounded-lg border bg-card p-4 text-card-foreground shadow-sm",
        data.kind === "master" &&
          "min-w-64 border-primary bg-primary text-primary-foreground",
        data.kind === "employee" && "border-chart-4/50 bg-chart-4/10",
        data.kind === "agent" && "border-chart-5/50 bg-chart-5/10",
        data.kind === "eoa" && "border-dashed",
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
        <StatusBadge status={data.status} isPlaceholder={data.isPlaceholder} />
      </div>
      <div
        className={cn(
          "mt-5 rounded-md border bg-background/70 px-3 py-2 font-mono text-xs text-muted-foreground",
          data.kind === "master" &&
            "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground",
        )}
      >
        {data.detail}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!border-border !bg-background"
      />
    </div>
  );
}

const nodeTypes = {
  delegation: DelegationNode,
};

function statusEdgeStyle(status: DelegationCanvasDelegation["status"]) {
  if (status === "active") {
    return {
      stroke: "hsl(var(--foreground))",
      strokeWidth: 2,
      opacity: 0.42,
    };
  }

  if (status === "revoked") {
    return {
      stroke: "hsl(var(--muted-foreground))",
      strokeWidth: 2,
      opacity: 0.2,
    };
  }

  return {
    stroke: "hsl(var(--muted-foreground))",
    strokeWidth: 2,
    strokeDasharray: "6 6",
    opacity: 0.34,
  };
}

function buildDelegateeNodeId(delegation: DelegationCanvasDelegation) {
  if (delegation.delegateeType === "eoa") {
    return `eoa:${delegation.id}`;
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
}: {
  company: DelegationCanvasCompany;
  employees: DelegationCanvasEmployee[];
  agents: DelegationCanvasAgent[];
  delegations: DelegationCanvasDelegation[];
  headerAction?: ReactNode;
}) {
  const { nodes, edges } = useMemo(() => {
    const delegationByDelegatee = new Map<string, DelegationCanvasDelegation>();
    const nextNodes: Node<DelegationNodeData>[] = [
      {
        id: "company:root",
        type: "delegation",
        position: { x: 60, y: 180 },
        data: {
          title: company.name,
          subtitle: "Company smart account",
          detail: company.smartAccountAddress
            ? formatWalletAddress(company.smartAccountAddress)
            : "**** **** **** ****",
          status: "root",
          kind: "master",
        },
      },
    ];

    for (const delegation of delegations) {
      delegationByDelegatee.set(buildDelegateeNodeId(delegation), delegation);
    }

    employees.forEach((employee, index) => {
      const nodeId = `user:${employee.id}`;
      const delegation = delegationByDelegatee.get(nodeId);

      nextNodes.push({
        id: nodeId,
        type: "delegation",
        position: delegation
          ? {
              x: delegation.canvasPositionX,
              y: delegation.canvasPositionY,
            }
          : { x: 420, y: 80 + index * 150 },
        data: {
          title: employee.label,
          subtitle: "Employee smart account",
          detail: employee.smartAccountAddress
            ? formatWalletAddress(employee.smartAccountAddress)
            : "Smart account pending",
          status: delegation?.status ?? "available",
          kind: "employee",
        },
      });
    });

    agents.forEach((agent, index) => {
      const nodeId = `agent:${agent.id}`;
      const delegation = delegationByDelegatee.get(nodeId);

      nextNodes.push({
        id: nodeId,
        type: "delegation",
        position: delegation
          ? {
              x: delegation.canvasPositionX,
              y: delegation.canvasPositionY,
            }
          : { x: 760, y: 100 + index * 150 },
        data: {
          title: agent.name,
          subtitle: "Agent smart account",
          detail: agent.smartAccountAddress
            ? formatWalletAddress(agent.smartAccountAddress)
            : "Smart account pending",
          status: delegation?.status ?? "available",
          kind: "agent",
          isPlaceholder: agent.isPlaceholder,
        },
      });
    });

    delegations
      .filter((delegation) => delegation.delegateeType === "eoa")
      .forEach((delegation, index) => {
        nextNodes.push({
          id: buildDelegateeNodeId(delegation),
          type: "delegation",
          position: {
            x: delegation.canvasPositionX || 1020,
            y: delegation.canvasPositionY || 100 + index * 150,
          },
          data: {
            title: delegation.delegateeLabel ?? "External address",
            subtitle: "Terminal EOA",
            detail: delegation.delegateeAddress
              ? formatWalletAddress(delegation.delegateeAddress)
              : "Address pending",
            status: delegation.status,
            kind: "eoa",
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
          type: "smoothstep",
          animated: delegation.status === "active",
          style: statusEdgeStyle(delegation.status),
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "hsl(var(--foreground))",
          },
        });

        return edges;
      }, []);

    return { nodes: nextNodes, edges: nextEdges };
  }, [agents, company, delegations, employees]);

  return (
    <div className="flex h-[620px] min-h-[520px] flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {headerAction}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Delegation tree
            </p>
            <h3 className="mt-1 text-base font-semibold text-card-foreground">
              Company authority map
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleDotIcon />
          {nodes.length} nodes
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
            type: "smoothstep",
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
