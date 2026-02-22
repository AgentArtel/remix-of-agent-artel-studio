import React, { useState } from 'react';
import { ArrowLeft, Database, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArchitectureCanvas } from './ArchitectureCanvas';
import { SystemCard } from './SystemCard';
import { SYSTEM_DIAGRAMS, type SystemDiagram } from './architectureDiagrams';

// ── Detail Sidebar ────────────────────────────────────────────────────────

const DetailSidebar: React.FC<{ diagram: SystemDiagram }> = ({ diagram }) => {
  const Icon = diagram.icon;
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className={cn('flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0', diagram.colorClass)}>
          <Icon className="w-4.5 h-4.5" />
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
        <div className="space-y-1.5">
          {diagram.edgeFunctions.map(fn => (
            <div key={fn} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
              <span className="text-xs font-mono text-foreground">{fn}</span>
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
        <div className="space-y-1.5">
          {diagram.tables.map(table => (
            <div key={table} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-xs font-mono text-foreground">{table}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────

export const ArchitectureView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedDiagram = SYSTEM_DIAGRAMS.find(d => d.id === selectedId) ?? null;

  // ── Catalog View ──
  if (!selectedDiagram) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Select a system to explore its architecture and data flow.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SYSTEM_DIAGRAMS.map(d => (
            <SystemCard key={d.id} diagram={d} onClick={() => setSelectedId(d.id)} />
          ))}
        </div>
      </div>
    );
  }

  // ── Detail View ──
  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => setSelectedId(null)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        All Systems
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6">
        {/* Canvas */}
        <ArchitectureCanvas nodes={selectedDiagram.nodes} connections={selectedDiagram.connections} />

        {/* Sidebar */}
        <DetailSidebar diagram={selectedDiagram} />
      </div>
    </div>
  );
};
