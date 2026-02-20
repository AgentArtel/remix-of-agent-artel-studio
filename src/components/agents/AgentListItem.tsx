import React from 'react';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PicoClawAgent } from '@/hooks/usePicoClawAgents';

interface AgentListItemProps {
  agent: PicoClawAgent;
  isSelected: boolean;
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
  onClick,
}) => {
  const dot = statusDot[agent.deployment_status] ?? 'bg-white/20';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors border w-full text-left',
        isSelected
          ? 'bg-green/10 border-green/30'
          : 'bg-white/[0.03] border-transparent hover:bg-white/5 hover:border-white/10',
      )}
    >
      <div className="relative shrink-0">
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white/50" />
        </div>
        <span className={cn('absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-dark-200', dot)} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-white truncate block">
          {agent.picoclaw_agent_id}
        </span>
        <span className="text-[11px] text-white/30 truncate block">
          {agent.llm_model}
        </span>
      </div>
    </button>
  );
};
