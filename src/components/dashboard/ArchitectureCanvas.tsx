import React, { useState, useCallback } from 'react';
import { Canvas } from '@/components/canvas/Canvas';
import { CanvasNode } from '@/components/canvas/CanvasNode';
import { ConnectionLine } from '@/components/canvas/ConnectionLine';
import type { NodeData, Connection } from '@/types';
import { getPortOffset } from '@/lib/portRegistry';

// ── Architecture Nodes ────────────────────────────────────────────────────

const ARCH_NODES: NodeData[] = [
  {
    id: 'user-msg',
    type: 'trigger',
    position: { x: 300, y: 40 },
    title: 'User Message',
    subtitle: 'Player sends chat message',
    isConfigured: true,
  },
  {
    id: 'npc-ai-chat',
    type: 'webhook',
    position: { x: 300, y: 200 },
    title: 'npc-ai-chat',
    subtitle: 'Edge Function — validates session',
    isConfigured: true,
  },
  {
    id: 'load-skills',
    type: 'memory',
    position: { x: 300, y: 360 },
    title: 'Load Agent Skills',
    subtitle: 'picoclaw_agent_skills + picoclaw_skills',
  },
  {
    id: 'build-schemas',
    type: 'code-tool',
    position: { x: 300, y: 520 },
    title: 'Build Tool Schemas',
    subtitle: 'Convert skills → function schemas',
    isConfigured: true,
  },
  {
    id: 'call-llm',
    type: 'ai-agent',
    position: { x: 300, y: 680 },
    title: 'Call LLM with Tools',
    subtitle: 'Gemini / gateway model',
    isConfigured: true,
  },
  {
    id: 'execute-tool',
    type: 'http-tool',
    position: { x: 620, y: 680 },
    title: 'Execute Tool Handler',
    subtitle: 'memory, search, image gen, etc.',
  },
  {
    id: 'final-response',
    type: 'trigger',
    position: { x: 300, y: 900 },
    title: 'Final Response',
    subtitle: 'Return assistant message to client',
    isConfigured: true,
  },
];

const ARCH_CONNECTIONS: Connection[] = [
  { id: 'c1', from: 'user-msg', to: 'npc-ai-chat', fromPort: 'output', toPort: 'input' },
  { id: 'c2', from: 'npc-ai-chat', to: 'load-skills', fromPort: 'output', toPort: 'input' },
  { id: 'c3', from: 'load-skills', to: 'build-schemas', fromPort: 'output', toPort: 'input' },
  { id: 'c4', from: 'build-schemas', to: 'call-llm', fromPort: 'output', toPort: 'input' },
  { id: 'c5', from: 'call-llm', to: 'final-response', fromPort: 'output', toPort: 'input' },
  // Tool execution branch
  { id: 'c6', from: 'call-llm', to: 'execute-tool', fromPort: 'tool', toPort: 'input', label: 'tool_call', animated: true },
  // Loop back
  { id: 'c7', from: 'execute-tool', to: 'call-llm', fromPort: 'output', toPort: 'input', label: 'result → re-call', animated: true },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const NODE_W = 220;
const NODE_H = 90;

function getNodePortPos(node: NodeData, portId: string): { x: number; y: number } {
  const offset = getPortOffset(portId as any, NODE_W, NODE_H);
  return { x: node.position.x + offset.x, y: node.position.y + offset.y };
}

// ── Component ─────────────────────────────────────────────────────────────

export const ArchitectureCanvas: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // No-op handlers for read-only mode
  const noop = useCallback(() => {}, []);
  const noopMove = useCallback((_id: string, _pos: { x: number; y: number }) => {}, []);

  return (
    <div className="w-full h-[700px] rounded-xl border border-border overflow-hidden">
      <Canvas
        nodes={ARCH_NODES}
        connections={ARCH_CONNECTIONS}
        selectedNodeId={selectedNodeId}
        onNodeSelect={setSelectedNodeId}
        onNodeMove={noopMove}
        onConnectionStart={noop}
        onConnectionEnd={noop}
      >
        {/* Connections */}
        {ARCH_CONNECTIONS.map((conn) => {
          const fromNode = ARCH_NODES.find((n) => n.id === conn.from);
          const toNode = ARCH_NODES.find((n) => n.id === conn.to);
          if (!fromNode || !toNode) return null;

          return (
            <ConnectionLine
              key={conn.id}
              connection={conn}
              fromPos={getNodePortPos(fromNode, conn.fromPort)}
              toPos={getNodePortPos(toNode, conn.toPort)}
              isAnimating={conn.animated}
              label={conn.label}
            />
          );
        })}

        {/* Nodes */}
        {ARCH_NODES.map((node) => (
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
