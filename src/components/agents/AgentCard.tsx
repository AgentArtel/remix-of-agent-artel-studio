import React from 'react';
import { cn } from '@/lib/utils';
import { Edit2, Trash2, Play, Square, Bot } from 'lucide-react';

interface AgentCardProps {
  name: string;
  agentSlug: string;
  llmBackend: string;
  llmModel: string;
  status: 'draft' | 'running' | 'stopped' | 'error';
  skillCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onDeploy: () => void;
  onStop: () => void;
}

const statusConfig = {
  draft: { dot: 'bg-white/20', label: 'Draft', text: 'text-white/40' },
  running: { dot: 'bg-green', label: 'Running', text: 'text-green' },
  stopped: { dot: 'bg-amber-400', label: 'Stopped', text: 'text-amber-400' },
  error: { dot: 'bg-red-400', label: 'Error', text: 'text-red-400' },
};

export const AgentCard: React.FC<AgentCardProps> = ({
  name,
  agentSlug,
  llmBackend,
  llmModel,
  status,
  skillCount,
  onEdit,
  onDelete,
  onDeploy,
  onStop,
}) => {
  const s = statusConfig[status];

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl bg-dark-100 border transition-all duration-fast',
        status === 'running'
          ? 'border-green/30 hover:border-green/50 hover:shadow-glow'
          : 'border-white/5 hover:border-white/10',
      )}
    >
      {/* Status dot */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <span className={cn('text-[10px] uppercase tracking-wider font-medium', s.text)}>
          {s.label}
        </span>
        <div className={cn('w-2.5 h-2.5 rounded-full', s.dot)}>
          {status === 'running' && (
            <div className="absolute inset-0 rounded-full bg-green animate-ping opacity-30" />
          )}
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-dark-200 flex items-center justify-center">
          <Bot className="w-6 h-6 text-white/60" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{name}</h3>
          <p className="text-xs text-white/40 font-mono">{agentSlug}</p>
          <p className="text-xs text-white/30 mt-1">
            {llmBackend}/{llmModel}
          </p>
          <p className="text-[10px] text-white/30 mt-1">
            {skillCount} skill{skillCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" /> Edit
        </button>
        {status === 'running' ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-400/80 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
          >
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        ) : (
          <button
            onClick={onDeploy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-green/80 hover:text-green hover:bg-green/10 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Deploy
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-danger hover:bg-danger/10 transition-colors ml-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
