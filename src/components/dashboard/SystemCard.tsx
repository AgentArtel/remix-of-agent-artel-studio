import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import type { SystemDiagram } from './architectureDiagrams';

interface SystemCardProps {
  diagram: SystemDiagram;
  onClick: () => void;
}

export const SystemCard: React.FC<SystemCardProps> = ({ diagram, onClick }) => {
  const Icon = diagram.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-xl border border-border bg-card p-5',
        'hover:border-primary/40 hover:bg-card/80 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className={cn('flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0', diagram.colorClass)}>
            <Icon className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {diagram.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{diagram.description}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span>{diagram.nodes.length} nodes</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{diagram.edgeFunctions.length} edge fns</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{diagram.tables.length} tables</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
};
