import React from 'react';
import { Bot, Plus, MapPin, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PicoClawAgent } from '@/hooks/usePicoClawAgents';

interface AgentSlotCardProps {
  agent?: PicoClawAgent;
  isEmpty?: boolean;
  isSelected?: boolean;
  agentType?: 'game' | 'studio';
  onClick: () => void;
}

const statusDot: Record<string, string> = {
  running: 'bg-green',
  deployed: 'bg-green',
  stopped: 'bg-white/30',
  draft: 'bg-white/20',
  error: 'bg-destructive',
};

export const AgentSlotCard: React.FC<AgentSlotCardProps> = ({
  agent,
  isEmpty = false,
  isSelected = false,
  agentType = 'game',
  onClick,
}) => {
  const isStudio = agentType === 'studio';

  if (isEmpty) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <Plus className="w-5 h-5 text-white/20" />
        <span className="text-xs text-white/30 font-medium">
          {isStudio ? 'Create Studio Agent' : 'Create Agent'}
        </span>
      </button>
    );
  }

  if (!agent) return null;
  const dot = statusDot[agent.deployment_status] ?? 'bg-white/20';
  const Icon = isStudio ? Sparkles : Bot;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 px-5 py-4 rounded-xl transition-colors border w-full text-left',
        isSelected
          ? isStudio
            ? 'bg-accent/10 border-accent/30'
            : 'bg-green/10 border-green/30'
          : 'bg-white/[0.03] border-transparent hover:bg-white/5 hover:border-white/10',
      )}
    >
      <div className="relative shrink-0">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          isStudio ? 'bg-accent/10' : 'bg-white/5',
        )}>
          <Icon className={cn('w-6 h-6', isStudio ? 'text-accent' : 'text-white/50')} />
        </div>
        <span className={cn('absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-dark-200', dot)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate block">
            {agent.picoclaw_agent_id}
          </span>
          {isStudio && (
            <span className="text-[10px] font-medium text-accent/70 bg-accent/10 px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0">
              Studio
            </span>
          )}
        </div>
        <span className="text-xs text-white/30 truncate block mt-0.5">
          {agent.llm_model}
        </span>
        {agent.agent_config_id && (
          <span className="flex items-center gap-1 mt-0.5">
            <MapPin className="w-2.5 h-2.5 text-blue-400/60" />
            <span className="text-[10px] text-blue-400/50 font-mono">{agent.agent_config_id.slice(0, 8)}</span>
          </span>
        )}
      </div>
    </button>
  );
};
