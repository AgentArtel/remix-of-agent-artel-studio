import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { CanvasNode } from '@/components/canvas/CanvasNode';
import { ConnectionLine } from '@/components/canvas/ConnectionLine';
import type { NodeData, Connection } from '@/types';

// ── Port position helper (works for all node types regardless of port registry) ──

const NODE_W = 220;
const NODE_H = 90;

function getPortPos(node: NodeData, portId: string): { x: number; y: number } {
  const offsets: Record<string, { x: number; y: number }> = {
    input:  { x: NODE_W / 2, y: 0 },
    output: { x: NODE_W / 2, y: NODE_H },
    tool:   { x: NODE_W, y: NODE_H / 2 },
    memory: { x: 0, y: NODE_H / 2 },
  };
  const offset = offsets[portId] ?? offsets.output;
  return { x: node.position.x + offset.x, y: node.position.y + offset.y };
}

// ── Props ──

interface ArchitectureCanvasProps {
  nodes: NodeData[];
  connections: Connection[];
}

// ── Component ──

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({ nodes, connections }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const hasFitted = useRef(false);

  const noop = useCallback(() => {}, []);
  const noopMove = useCallback((_id: string, _pos: { x: number; y: number }) => {}, []);

  // Auto fit-to-view on mount / when nodes change
  useEffect(() => {
    hasFitted.current = false;
  }, [nodes]);

  useEffect(() => {
    if (hasFitted.current) return;
    // Find the ZoomControls fit-to-view button and click it after a short delay
    const timer = setTimeout(() => {
      const container = canvasRef.current;
      if (!container) return;
      const btn = container.querySelector('[title="Fit to view"]') as HTMLButtonElement | null;
      btn?.click();
      hasFitted.current = true;
    }, 100);
    return () => clearTimeout(timer);
  }, [nodes]);

  return (
    <div ref={canvasRef} className="w-full h-[600px] rounded-xl border border-border overflow-hidden">
      <Canvas
        nodes={nodes}
        connections={connections}
        selectedNodeId={selectedNodeId}
        onNodeSelect={setSelectedNodeId}
        onNodeMove={noopMove}
        onConnectionStart={noop}
        onConnectionEnd={noop}
      >
        {/* Connections */}
        {connections.map((conn) => {
          const fromNode = nodes.find((n) => n.id === conn.from);
          const toNode = nodes.find((n) => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          return (
            <ConnectionLine
              key={conn.id}
              connection={conn}
              fromPos={getPortPos(fromNode, conn.fromPort)}
              toPos={getPortPos(toNode, conn.toPort)}
              isAnimating={conn.animated}
              label={conn.label}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <CanvasNode
            key={node.id}
            data={node}
            isSelected={selectedNodeId === node.id}
            onClick={() => setSelectedNodeId(node.id)}
          />
        ))}
      </Canvas>
    </div>
  );
};
