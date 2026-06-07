"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

const nodes: Node[] = [
  {
    id: "brief",
    position: { x: 70, y: 70 },
    data: { label: "Project brief" },
    style: {
      width: 220,
      borderRadius: 16,
      border: "1px solid hsl(var(--border))",
      background: "hsl(var(--card))",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
      color: "hsl(var(--card-foreground))",
      padding: 18,
      fontSize: 14,
      fontWeight: 600,
    },
  },
  {
    id: "plan",
    position: { x: 420, y: 180 },
    data: { label: "Execution plan" },
    style: {
      width: 240,
      borderRadius: 16,
      border: "1px solid hsl(var(--border))",
      background: "hsl(var(--card))",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
      color: "hsl(var(--card-foreground))",
      padding: 18,
      fontSize: 14,
      fontWeight: 600,
    },
  },
  {
    id: "review",
    position: { x: 170, y: 320 },
    data: { label: "Review" },
    style: {
      width: 180,
      borderRadius: 16,
      border: "1px solid hsl(var(--border))",
      background: "hsl(var(--card))",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
      color: "hsl(var(--card-foreground))",
      padding: 18,
      fontSize: 14,
      fontWeight: 600,
    },
  },
  {
    id: "ship",
    position: { x: 690, y: 300 },
    data: { label: "Ship" },
    style: {
      width: 180,
      borderRadius: 16,
      border: "1px solid hsl(var(--border))",
      background: "hsl(var(--card))",
      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
      color: "hsl(var(--card-foreground))",
      padding: 18,
      fontSize: 14,
      fontWeight: 600,
    },
  },
];

const edges: Edge[] = [
  {
    id: "brief-plan",
    source: "brief",
    target: "plan",
    type: "smoothstep",
    animated: true,
    style: {
      stroke: "hsl(var(--foreground))",
      strokeWidth: 2,
      opacity: 0.4,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "hsl(var(--foreground))",
    },
  },
  {
    id: "brief-review",
    source: "brief",
    target: "review",
    type: "smoothstep",
    style: {
      stroke: "hsl(var(--foreground))",
      strokeWidth: 2,
      opacity: 0.28,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "hsl(var(--foreground))",
    },
  },
  {
    id: "plan-ship",
    source: "plan",
    target: "ship",
    type: "smoothstep",
    style: {
      stroke: "hsl(var(--foreground))",
      strokeWidth: 2,
      opacity: 0.28,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "hsl(var(--foreground))",
    },
  },
];

export function DashboardFlowCanvas() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Canvas
          </p>
          <h3 className="mt-1 text-base font-semibold text-card-foreground">
            React Flow workspace
          </h3>
        </div>
        <div className="text-sm text-muted-foreground">
          Fills the remaining space without overflow.
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4 lg:p-6">
        <div className="h-full min-h-0 overflow-hidden rounded-2xl border border-border/70 bg-background/60">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag
            zoomOnScroll
            minZoom={0.8}
            maxZoom={1.4}
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
    </div>
  );
}
