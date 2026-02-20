import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PicoClawAgent } from '@/hooks/usePicoClawAgents';

interface AgentListItemProps {
  agent: PicoClawAgent;
  isSelected: boolean;
  skillCount: number;
  onClick: () => void;
}

const statusDot: Record<string, string> = {
  running: 'bg-green',
  deployed: 'bg-green',
  stopped: 'bg-white/30',
  draft: 'bg-white/20',
  error: 'bg-destructive',
};

export const AgentListItem: React.FC<AgentListItemProps> = ({
  agent,
  isSelected,
  skillCount,
  onClick,
}) => {
  const dot = statusDot[agent.deployment_status] ?? 'bg-white/20';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors border',
        isSelected
          ? 'bg-green/10 border-green/30'
          : 'bg-transparent border-transparent hover:bg-white/5',
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white/50" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {agent.picoclaw_agent_id}
          </span>
          <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
        </div>
        <span className="text-xs text-white/40 truncate block">
          {agent.llm_backend}/{agent.llm_model}
        </span>
      </div>

      {skillCount > 0 && (
        <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full shrink-0">
          {skillCount}
        </span>
      )}
    </button>
  );
};
