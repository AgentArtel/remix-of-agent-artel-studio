import React, { useState } from 'react';
import { Database, Zap, Plus, Gamepad2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArchitectureCanvas } from './ArchitectureCanvas';
import { SystemCard } from './SystemCard';
import { SYSTEM_DIAGRAMS, DIAGRAM_CATEGORIES, getGameScaffoldNodes, type SystemDiagram } from './architectureDiagrams';

// ── Detail Sidebar ────────────────────────────────────────────────────────

const DetailSidebar: React.FC<{ diagram: SystemDiagram }> = ({ diagram }) => {
  const Icon = diagram.icon;
  return (
    <div className="space-y-5 overflow-y-auto max-h-full scrollbar-thin">
      <div className="flex items-start gap-3">
        <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0', diagram.colorClass)}>
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{diagram.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{diagram.description}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Edge Functions</span>
        </div>
        <div className="space-y-1">
          {diagram.edgeFunctions.map(fn => (
            <div key={fn} className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-[11px] font-mono text-foreground">{fn}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs font-medium text-foreground">Database Tables</span>
        </div>
        <div className="space-y-1">
          {diagram.tables.map(table => (
            <div key={table} className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-[11px] font-mono text-foreground">{table}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Game Integration Placeholder ──────────────────────────────────────────

const GameIntegrationPlaceholder: React.FC<{ systemTitle: string; onScaffold: () => void; isLoading: boolean }> = ({ systemTitle, onScaffold, isLoading }) => (
  <button
    onClick={onScaffold}
    disabled={isLoading}
    className="w-full h-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-card/30 hover:bg-card/50 transition-all duration-200 flex flex-col items-center justify-center gap-3 group cursor-pointer disabled:opacity-50"
  >
    <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
      <Plus className="w-6 h-6 text-primary/60 group-hover:text-primary transition-colors" />
    </div>
    <div className="text-center">
      <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {isLoading ? 'Creating...' : 'Map Game Integration'}
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1 max-w-[280px]">
        Scaffold how <span className="text-primary/80">{systemTitle}</span> integrates with RPG game nodes &amp; PicoClaw agents
      </p>
    </div>
    <div className="flex items-center gap-1.5 mt-1">
      <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground/40" />
      <span className="text-[10px] text-muted-foreground/40">Game Design Workflow</span>
    </div>
  </button>
);

// ── Main Component ────────────────────────────────────────────────────────

interface GameDesignData {
  id: string;
  systemId: string;
  nodes: any[];
  connections: any[];
}

function parseArchTag(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/\[arch:([^\]]+)\]/);
  return match ? match[1] : null;
}

export const ArchitectureView: React.FC = () => {
  const [selectedId, setSelectedId] = useState(SYSTEM_DIAGRAMS[0].id);
  const selectedDiagram = SYSTEM_DIAGRAMS.find(d => d.id === selectedId) ?? SYSTEM_DIAGRAMS[0];
  const queryClient = useQueryClient();

  // Load all game design workflows
  const { data: gameDesigns = [] } = useQuery<GameDesignData[]>({
    queryKey: ['arch-game-designs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('studio_workflows')
        .select('id, description, nodes_data, connections_data')
        .like('description', '[arch:%]%');
      if (error) throw error;
      return (data ?? []).map(row => ({
        id: row.id,
        systemId: parseArchTag(row.description) ?? '',
        nodes: (row.nodes_data as any[]) ?? [],
        connections: (row.connections_data as any[]) ?? [],
      })).filter(d => d.systemId);
    },
  });

  const gameDesignMap = new Map(gameDesigns.map(d => [d.systemId, d]));
  const currentGameDesign = gameDesignMap.get(selectedId);

  // Create game design mutation
  const createMutation = useMutation({
    mutationFn: async (systemId: string) => {
      const diagram = SYSTEM_DIAGRAMS.find(d => d.id === systemId);
      if (!diagram) throw new Error('Diagram not found');
      const { nodes, connections } = getGameScaffoldNodes(systemId);
      const { error } = await supabase.from('studio_workflows').insert({
        name: `Game Design: ${diagram.title}`,
        description: `[arch:${systemId}] Game integration mapping`,
        nodes_data: nodes as any,
        connections_data: connections as any,
        node_count: nodes.length,
        status: 'draft',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arch-game-designs'] });
      toast.success('Game integration scaffold created');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete game design mutation
  const deleteMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const { error } = await supabase.from('studio_workflows').delete().eq('id', workflowId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arch-game-designs'] });
      toast.success('Game integration removed');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="grid grid-cols-[220px_1fr_260px] gap-4 h-[calc(100vh-120px)]">
      {/* Left rail — system cards grouped by category */}
      <div className="space-y-3 overflow-y-auto scrollbar-thin pr-1">
        {DIAGRAM_CATEGORIES.map(cat => {
          const diagrams = SYSTEM_DIAGRAMS.filter(d => d.category === cat);
          if (diagrams.length === 0) return null;
          return (
            <div key={cat}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                {cat}
              </div>
              <div className="space-y-1">
                {diagrams.map(d => (
                  <SystemCard
                    key={d.id}
                    diagram={d}
                    isActive={d.id === selectedId}
                    hasGameDesign={gameDesignMap.has(d.id)}
                    onClick={() => setSelectedId(d.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center — stacked canvases */}
      <div className="flex flex-col gap-3 min-h-0">
        {/* System Flow (top) */}
        <div className="flex-1 min-h-0 rounded-xl border border-border overflow-hidden">
          <div className="px-3 py-1.5 border-b border-border bg-card/50 flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[11px] font-medium text-muted-foreground">System Flow</span>
          </div>
          <ArchitectureCanvas
            key={selectedId}
            nodes={selectedDiagram.nodes}
            connections={selectedDiagram.connections}
            className="h-[calc(100%-30px)]"
          />
        </div>

        {/* Game Integration (bottom) */}
        <div className="flex-1 min-h-0 rounded-xl overflow-hidden">
          {currentGameDesign ? (
            <div className="h-full border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border bg-card/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px] font-medium text-muted-foreground">Game Integration</span>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(currentGameDesign.id)}
                  disabled={deleteMutation.isPending}
                  className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove game integration"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <ArchitectureCanvas
                key={`game-${selectedId}-${currentGameDesign.id}`}
                nodes={currentGameDesign.nodes}
                connections={currentGameDesign.connections}
                className="h-[calc(100%-30px)]"
              />
            </div>
          ) : (
            <GameIntegrationPlaceholder
              systemTitle={selectedDiagram.title}
              onScaffold={() => createMutation.mutate(selectedId)}
              isLoading={createMutation.isPending}
            />
          )}
        </div>
      </div>

      {/* Right — detail sidebar */}
      <DetailSidebar diagram={selectedDiagram} />
    </div>
  );
};
