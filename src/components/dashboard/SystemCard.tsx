import React from 'react';
import { cn } from '@/lib/utils';
import type { SystemDiagram } from './architectureDiagrams';

interface SystemCardProps {
  diagram: SystemDiagram;
  isActive: boolean;
  onClick: () => void;
}

export const SystemCard: React.FC<SystemCardProps> = ({ diagram, isActive, onClick }) => {
  const Icon = diagram.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'border-primary/50 bg-primary/10'
          : 'border-border bg-card hover:border-primary/30 hover:bg-card/80'
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('flex items-center justify-center w-7 h-7 rounded-md flex-shrink-0', diagram.colorClass)}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className={cn(
            'text-xs font-semibold truncate transition-colors',
            isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'
          )}>
            {diagram.title}
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {diagram.nodes.length} nodes · {diagram.edgeFunctions.length} fns
          </span>
        </div>
      </div>
    </button>
  );
};
