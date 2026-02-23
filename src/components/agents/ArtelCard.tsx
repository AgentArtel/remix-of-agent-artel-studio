import React from 'react';
import { Users, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArtelCardProps {
  name?: string;
  agentCount?: number;
  isEmpty?: boolean;
  isSelected?: boolean;
  onClick: () => void;
}

export const ArtelCard: React.FC<ArtelCardProps> = ({
  name,
  agentCount = 0,
  isEmpty = false,
  isSelected = false,
  onClick,
}) => {
  if (isEmpty) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <Plus className="w-5 h-5 text-white/20" />
        <span className="text-xs text-white/30 font-medium">Create New Artel</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-4 rounded-xl transition-colors border w-full text-left',
        isSelected
          ? 'bg-accent/10 border-accent/30'
          : 'bg-white/[0.03] border-transparent hover:bg-white/5 hover:border-white/10',
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
        <Users className="w-5 h-5 text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-white truncate block">{name}</span>
        <span className="text-xs text-white/30">{agentCount} agents</span>
      </div>
    </button>
  );
};
