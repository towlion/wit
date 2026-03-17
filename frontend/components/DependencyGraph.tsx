"use client";

import { useMemo, useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { WorkItem, WorkflowState } from "@/lib/types";
import DependencyNode from "./DependencyNode";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 70;

const nodeTypes = { dependency: DependencyNode };

interface DependencyGraphProps {
  items: WorkItem[];
  states: WorkflowState[];
  onCardClick: (item: WorkItem) => void;
}

function layoutGraph(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export default function DependencyGraph({ items, states, onCardClick }: DependencyGraphProps) {
  const [showAll, setShowAll] = useState(false);

  const stateMap = useMemo(() => {
    const map: Record<number, WorkflowState> = {};
    for (const s of states) map[s.id] = s;
    return map;
  }, [states]);

  const itemMap = useMemo(() => {
    const map: Record<number, WorkItem> = {};
    for (const item of items) map[item.id] = item;
    return map;
  }, [items]);

  // Items that have any dependency relationship
  const connectedItemIds = useMemo(() => {
    const ids = new Set<number>();
    for (const item of items) {
      if (item.blocks.length > 0 || item.blocked_by.length > 0) {
        ids.add(item.id);
        for (const dep of item.blocks) ids.add(dep.item_id);
        for (const dep of item.blocked_by) ids.add(dep.item_id);
      }
    }
    return ids;
  }, [items]);

  const { nodes, edges } = useMemo(() => {
    const visibleItems = showAll
      ? items
      : items.filter((item) => connectedItemIds.has(item.id));

    const itemIdSet = new Set(visibleItems.map((i) => i.id));

    const rawNodes: Node[] = visibleItems.map((item) => {
      const state = stateMap[item.status_id];
      return {
        id: String(item.id),
        type: "dependency",
        position: { x: 0, y: 0 },
        data: {
          item,
          stateColor: state?.color || "#71717a",
          stateName: state?.name || "Unknown",
        },
      };
    });

    const rawEdges: Edge[] = [];
    for (const item of visibleItems) {
      for (const blocked of item.blocks) {
        // Only add edge if both ends are visible
        if (itemIdSet.has(blocked.item_id)) {
          rawEdges.push({
            id: `e-${item.id}-${blocked.item_id}`,
            source: String(item.id),
            target: String(blocked.item_id),
            animated: true,
            style: { stroke: "var(--text-muted)", strokeWidth: 1.5 },
            markerEnd: { type: "arrowclosed" as const, color: "var(--text-muted)" },
          });
        }
      }
    }

    const laidOutNodes = rawNodes.length > 0 ? layoutGraph(rawNodes, rawEdges) : rawNodes;
    return { nodes: laidOutNodes, edges: rawEdges };
  }, [items, states, showAll, connectedItemIds, stateMap]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const item = itemMap[Number(node.id)];
      if (item) onCardClick(item);
    },
    [itemMap, onCardClick]
  );

  const hasDependencies = connectedItemIds.size > 0;

  if (!hasDependencies && !showAll) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
        <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <p className="text-sm">No dependencies in this project yet.</p>
        <p className="text-xs">Add blocking relationships between items to see the dependency graph.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)] shrink-0">
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
            className="rounded border-[var(--border)] bg-[var(--bg-tertiary)]"
          />
          Show items without dependencies
        </label>
        <span className="text-[10px] text-[var(--text-muted)]">
          {nodes.length} items &middot; {edges.length} dependencies
        </span>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls
            className="!bg-[var(--bg-secondary)] !border-[var(--border)] !rounded-xl !shadow-lg [&>button]:!bg-[var(--bg-secondary)] [&>button]:!border-[var(--border)] [&>button]:!text-[var(--text-secondary)] [&>button:hover]:!bg-[var(--bg-tertiary)]"
          />
          <MiniMap
            className="!bg-[var(--bg-secondary)] !border-[var(--border)] !rounded-xl"
            nodeColor="#6366f1"
            maskColor="rgba(0,0,0,0.3)"
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="var(--border)" />
        </ReactFlow>
      </div>
    </div>
  );
}
