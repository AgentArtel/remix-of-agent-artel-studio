import React, { useState } from 'react';
import { Database, Zap, Plus, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArchitectureCanvas } from './ArchitectureCanvas';
import { SystemCard } from './SystemCard';
import { SYSTEM_DIAGRAMS, DIAGRAM_CATEGORIES, type SystemDiagram } from './architectureDiagrams';

// ── Detail Sidebar ────────────────────────────────────────────────────────

const DetailSidebar: React.FC<{ diagram: SystemDiagram }> = ({ diagram }) => {
  const Icon = diagram.icon;
  return (
    <div className="space-y-5 overflow-y-auto max-h-full scrollbar-thin">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={cn('flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0', diagram.colorClass)}>
          <Icon className="w-4 h-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{diagram.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{diagram.description}</p>
        </div>
      </div>

      {/* Edge Functions */}
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

      {/* Tables */}
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

const GameIntegrationPlaceholder: React.FC<{ systemTitle: string; onScaffold: () => void }> = ({ systemTitle, onScaffold }) => (
  <button
    onClick={onScaffold}
    className="w-full h-full rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-card/30 hover:bg-card/50 transition-all duration-200 flex flex-col items-center justify-center gap-3 group cursor-pointer"
  >
    <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
      <Plus className="w-6 h-6 text-primary/60 group-hover:text-primary transition-colors" />
    </div>
    <div className="text-center">
      <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        Map Game Integration
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

export const ArchitectureView: React.FC = () => {
  const [selectedId, setSelectedId] = useState(SYSTEM_DIAGRAMS[0].id);
  const selectedDiagram = SYSTEM_DIAGRAMS.find(d => d.id === selectedId) ?? SYSTEM_DIAGRAMS[0];

  // TODO: Load game design workflows from studio_workflows where description contains [arch:{selectedId}]
  const gameDesignExists = false;

  const handleScaffoldGameDesign = () => {
    // TODO: Duplicate current system nodes, add game/picoclaw nodes, save to studio_workflows
    console.log(`Scaffold game design for: ${selectedDiagram.title}`);
  };

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
          {gameDesignExists ? (
            <div className="h-full border border-border rounded-xl overflow-hidden">
              <div className="px-3 py-1.5 border-b border-border bg-card/50 flex items-center gap-2">
                <Gamepad2 className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] font-medium text-muted-foreground">Game Integration</span>
              </div>
              {/* TODO: Render saved game design canvas here */}
              <ArchitectureCanvas
                key={`game-${selectedId}`}
                nodes={selectedDiagram.nodes}
                connections={selectedDiagram.connections}
                className="h-[calc(100%-30px)]"
              />
            </div>
          ) : (
            <GameIntegrationPlaceholder
              systemTitle={selectedDiagram.title}
              onScaffold={handleScaffoldGameDesign}
            />
          )}
        </div>
      </div>

      {/* Right — detail sidebar */}
      <DetailSidebar diagram={selectedDiagram} />
    </div>
  );
};
