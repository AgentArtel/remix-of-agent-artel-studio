import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bot, Cpu, Brain, Zap, Plus, X, Pencil, Settings2 } from 'lucide-react';
import type { PicoClawAgent, PicoClawSkill, PicoClawAgentSkill } from '@/hooks/usePicoClawAgents';
import { cn } from '@/lib/utils';

interface AgentDetailPanelProps {
  agent: PicoClawAgent;
  skills: PicoClawSkill[];
  agentSkills: PicoClawAgentSkill[];
  onAssignSkill: (skillId: string) => void;
  onRemoveSkill: (skillId: string) => void;
  onEdit: () => void;
}

export const AgentDetailPanel: React.FC<AgentDetailPanelProps> = ({
  agent,
  skills,
  agentSkills,
  onAssignSkill,
  onRemoveSkill,
  onEdit,
}) => {
  const assignedIds = new Set(agentSkills.map((as) => as.skill_id));
  const assignedSkills = skills.filter((s) => assignedIds.has(s.id));
  const availableSkills = skills.filter((s) => !assignedIds.has(s.id));

  const isRunning = agent.deployment_status === 'running';

  return (
    <div className="h-full flex flex-col bg-dark-200 rounded-xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-white/40" />
          <span className="text-sm font-semibold text-white/70">Agent Details</span>
        </div>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-white/40 hover:text-white" onClick={onEdit}>
          <Pencil className="w-3 h-3 mr-1" /> Edit Config
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Model Info */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Model</h4>
          <div className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-green" />
              <span className="text-sm text-white font-medium">{agent.llm_backend}/{agent.llm_model}</span>
            </div>
            <div className="flex gap-4 text-xs text-white/40">
              <span>Temp: {agent.temperature}</span>
              <span>Max tokens: {agent.max_tokens}</span>
              <span>Tool iters: {agent.max_tool_iterations}</span>
            </div>
          </div>
        </div>

        {/* Memory */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Memory</h4>
          <div className="flex gap-2">
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full border',
              agent.memory_enabled ? 'bg-green/10 border-green/20 text-green' : 'bg-white/5 border-white/10 text-white/30'
            )}>
              <Brain className="w-3 h-3 inline mr-1" />
              Short-term {agent.memory_enabled ? 'on' : 'off'}
            </span>
            <span className={cn(
              'text-xs px-2.5 py-1 rounded-full border',
              agent.long_term_memory_enabled ? 'bg-green/10 border-green/20 text-green' : 'bg-white/5 border-white/10 text-white/30'
            )}>
              <Brain className="w-3 h-3 inline mr-1" />
              Long-term {agent.long_term_memory_enabled ? 'on' : 'off'}
            </span>
          </div>
        </div>

        <Separator className="bg-white/5" />

        {/* Assigned Skills */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Assigned Skills ({assignedSkills.length})
          </h4>
          {assignedSkills.length > 0 ? (
            <div className="space-y-2">
              {assignedSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between bg-green/5 border border-green/15 rounded-lg px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-green shrink-0" />
                      <span className="text-sm text-white font-medium truncate">{skill.name}</span>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-white/30 shrink-0">
                        {skill.category}
                      </Badge>
                    </div>
                    {skill.description && (
                      <p className="text-xs text-white/30 mt-0.5 ml-5 truncate">{skill.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/20 hover:text-destructive shrink-0"
                    onClick={() => onRemoveSkill(skill.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/20 italic">No skills assigned</p>
          )}
        </div>

        {/* Available Skills */}
        {availableSkills.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
              Available Skills
            </h4>
            <div className="space-y-1.5">
              {availableSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => onAssignSkill(skill.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5 text-white/20 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-white/60 truncate block">{skill.name}</span>
                    {skill.description && (
                      <span className="text-xs text-white/20 truncate block">{skill.description}</span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/20 shrink-0">
                    {skill.category}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Personality Preview */}
        {agent.soul_md && (
          <>
            <Separator className="bg-white/5" />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Soul Preview</h4>
              <div className="bg-white/[0.02] rounded-lg p-3 text-xs text-white/40 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                {agent.soul_md.slice(0, 500)}{agent.soul_md.length > 500 && '...'}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
