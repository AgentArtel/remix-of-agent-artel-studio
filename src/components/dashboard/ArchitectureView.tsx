import React, { useState, useEffect } from 'react';
import { Database, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArchitectureCanvas } from './ArchitectureCanvas';
import { SystemCard } from './SystemCard';
import { SYSTEM_DIAGRAMS, type SystemDiagram } from './architectureDiagrams';

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

// ── Main Component ────────────────────────────────────────────────────────

export const ArchitectureView: React.FC = () => {
  const [selectedId, setSelectedId] = useState(SYSTEM_DIAGRAMS[0].id);
  const selectedDiagram = SYSTEM_DIAGRAMS.find(d => d.id === selectedId) ?? SYSTEM_DIAGRAMS[0];

  return (
    <div className="grid grid-cols-[220px_1fr_260px] gap-4 h-[calc(100vh-120px)]">
      {/* Left rail — system cards */}
      <div className="space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
        {SYSTEM_DIAGRAMS.map(d => (
          <SystemCard
            key={d.id}
            diagram={d}
            isActive={d.id === selectedId}
            onClick={() => setSelectedId(d.id)}
          />
        ))}
      </div>

      {/* Center — canvas */}
      <div className="rounded-xl border border-border overflow-hidden">
        <ArchitectureCanvas
          key={selectedId}
          nodes={selectedDiagram.nodes}
          connections={selectedDiagram.connections}
        />
      </div>

      {/* Right — detail sidebar */}
      <DetailSidebar diagram={selectedDiagram} />
    </div>
  );
};
