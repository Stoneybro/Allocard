import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";

const NODE_WIDTH_ESTIMATE = 288;
const NODE_HEIGHT_ESTIMATE = 160;

/**
 * Applies a dagre tree layout to the given nodes and edges.
 * Uses left-to-right (LR) rank direction — perfect for delegation/authority trees.
 * Returns new node objects with computed { x, y } positions.
 */
export function layoutTree<T extends Node>(nodes: T[], edges: Edge[]): T[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "LR",
    nodesep: 60,
    ranksep: 140,
    marginx: 40,
    marginy: 40,
  });

  for (const node of nodes) {
    const w = node.measured?.width ?? NODE_WIDTH_ESTIMATE;
    const h = node.measured?.height ?? NODE_HEIGHT_ESTIMATE;
    g.setNode(node.id, { width: w, height: h });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    const w = dagreNode.width ?? NODE_WIDTH_ESTIMATE;
    const h = dagreNode.height ?? NODE_HEIGHT_ESTIMATE;

    return {
      ...node,
      position: {
        x: dagreNode.x - w / 2,
        y: dagreNode.y - h / 2,
      },
    };
  });
}
