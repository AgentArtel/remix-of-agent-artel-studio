import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AgentDetailPanel } from '@/components/agents/AgentDetailPanel';
import { AgentFormModal } from '@/components/agents/AgentFormModal';
import { AgentChatTest } from '@/components/agents/AgentChatTest';
import { ArtelCard } from '@/components/agents/ArtelCard';
import { AgentSlotCard } from '@/components/agents/AgentSlotCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users } from 'lucide-react';
import {
  usePicoClawAgents,
  usePicoClawSkills,
  useAgentSkills,
  useAllAgentSkillCounts,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
  useDeployAgent,
  useStopAgent,
  useAssignSkill,
  useRemoveSkill,
  type PicoClawAgent,
  type CreateAgentInput,
} from '@/hooks/usePicoClawAgents';

interface AgentBuilderProps {
  onNavigate: (page: string) => void;
}

export const AgentBuilder: React.FC<AgentBuilderProps> = ({ onNavigate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<PicoClawAgent | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const { data: agents = [], isLoading } = usePicoClawAgents();
  const { data: skills = [] } = usePicoClawSkills();
  const { data: agentSkills = [] } = useAgentSkills(editingAgent?.id ?? selectedAgentId ?? null);
  const { data: allSkillCounts = {} } = useAllAgentSkillCounts();

  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();
  const deployMutation = useDeployAgent();
  const stopMutation = useStopAgent();
  const assignSkillMutation = useAssignSkill();
  const removeSkillMutation = useRemoveSkill();

  const selectedAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) : null;

  const openCreate = useCallback(() => {
    setEditingAgent(null);
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((agent: PicoClawAgent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (!window.confirm('Delete this agent? This cannot be undone.')) return;
      deleteMutation.mutate(id);
      if (selectedAgentId === id) setSelectedAgentId(null);
    },
    [deleteMutation, selectedAgentId]
  );

  const handleSave = useCallback(
    (data: CreateAgentInput | (Partial<PicoClawAgent> & { id: string })) => {
      if ('id' in data && data.id) {
        updateMutation.mutate(data as Partial<PicoClawAgent> & { id: string }, {
          onSuccess: () => { setIsModalOpen(false); setEditingAgent(null); },
        });
      } else {
        createMutation.mutate(data as CreateAgentInput, {
          onSuccess: () => { setIsModalOpen(false); },
        });
      }
    },
    [createMutation, updateMutation]
  );

  const handleAssignSkill = useCallback(
    (skillId: string) => {
      const target = editingAgent ?? selectedAgent;
      if (!target) return;
      assignSkillMutation.mutate({ agentId: target.id, skillId });
    },
    [editingAgent, selectedAgent, assignSkillMutation]
  );

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      const target = editingAgent ?? selectedAgent;
      if (!target) return;
      removeSkillMutation.mutate({ agentId: target.id, skillId });
    },
    [editingAgent, selectedAgent, removeSkillMutation]
  );

  // Fill agent slots to always show 6
  const agentSlots = [...agents];
  const emptyAgentSlots = Math.max(0, 6 - agentSlots.length);

  return (
    <div className="min-h-screen bg-dark text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agents</h1>
          <p className="text-white/50 mt-1">Build and manage PicoClaw AI agents & artels</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Create Agent
        </Button>
      </div>

      {/* Main split layout */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left — Chat */}
        <div className="w-[42%] shrink-0 flex flex-col min-h-[600px]">
          {selectedAgent ? (
            <AgentChatTest
              agentId={selectedAgent.id}
              agentName={selectedAgent.picoclaw_agent_id}
              status={selectedAgent.deployment_status}
              llmBackend={selectedAgent.llm_backend}
              llmModel={selectedAgent.llm_model}
              onEdit={() => openEdit(selectedAgent)}
              onDeploy={() => deployMutation.mutate(selectedAgent.id)}
              onStop={() => stopMutation.mutate(selectedAgent.id)}
              onDelete={() => handleDelete(selectedAgent.id)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-dark-200 rounded-xl border border-white/5">
              <p className="text-white/20 text-sm">Select an agent or artel to start chatting</p>
            </div>
          )}
        </div>

        {/* Right — Artels + Agents + Config */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* Top half: Artels + Agents (50%) */}
          <div className="flex-[2] flex flex-col gap-5 overflow-y-auto pr-1">
            {/* Agent Artels Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-white/40" />
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Agent Artels</h2>
                <span className="text-xs text-white/20 ml-1">— groups of agents</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <ArtelCard
                  name="Research Team"
                  agentCount={3}
                  onClick={() => toast.info('Artels coming soon!')}
                />
                {Array.from({ length: 3 }).map((_, i) => (
                  <ArtelCard
                    key={`empty-artel-${i}`}
                    isEmpty
                    onClick={() => toast.info('Artels coming soon!')}
                  />
                ))}
              </div>
            </div>

            {/* Individual Agents Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Individual Agents</span>
                <span className="text-xs text-white/20">({agents.length})</span>
              </div>
              {isLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-[72px] rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {agentSlots.map((agent) => (
                    <AgentSlotCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                    />
                  ))}
                  {Array.from({ length: emptyAgentSlots }).map((_, i) => (
                    <AgentSlotCard
                      key={`empty-${i}`}
                      isEmpty
                      onClick={openCreate}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom half: Config Panel (50%) */}
          <div className="flex-[3] overflow-y-auto">
            {selectedAgent ? (
              <AgentDetailPanel
                agent={selectedAgent}
                skills={skills}
                agentSkills={agentSkills}
                onAssignSkill={handleAssignSkill}
                onRemoveSkill={handleRemoveSkill}
                onEdit={() => openEdit(selectedAgent)}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-dark-200 rounded-xl border border-white/5">
                <p className="text-white/20 text-sm">Select an agent or artel to view config</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AgentFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingAgent(null); }}
        onSave={handleSave}
        initialData={editingAgent}
        skills={skills}
        assignedSkillIds={agentSkills.map((as) => as.skill_id)}
        onAssignSkill={handleAssignSkill}
        onRemoveSkill={handleRemoveSkill}
      />
    </div>
  );
};
