import React, { useState, useCallback, useEffect } from 'react';
import { AgentFormModal } from '@/components/agents/AgentFormModal';
import { AgentChatTest } from '@/components/agents/AgentChatTest';
import { AgentListItem } from '@/components/agents/AgentListItem';
import { AgentDetailPanel } from '@/components/agents/AgentDetailPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Bot } from 'lucide-react';
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
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const { data: agentSkills = [] } = useAgentSkills(selectedAgentId);
  const { data: allSkillCounts = {} } = useAllAgentSkillCounts();

  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();
  const deployMutation = useDeployAgent();
  const stopMutation = useStopAgent();
  const assignSkillMutation = useAssignSkill();
  const removeSkillMutation = useRemoveSkill();

  // Auto-select first agent
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

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
      if (selectedAgentId === id) setSelectedAgentId(null);
      deleteMutation.mutate(id);
    },
    [deleteMutation, selectedAgentId],
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
    [createMutation, updateMutation],
  );

  const handleAssignSkill = useCallback(
    (skillId: string) => {
      if (!selectedAgentId) return;
      assignSkillMutation.mutate({ agentId: selectedAgentId, skillId });
    },
    [selectedAgentId, assignSkillMutation],
  );

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      if (!selectedAgentId) return;
      removeSkillMutation.mutate({ agentId: selectedAgentId, skillId });
    },
    [selectedAgentId, removeSkillMutation],
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-dark text-white">
      {/* ─── Top: Horizontal Agent Bar ─── */}
      <div className="shrink-0 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="h-[60px] bg-green/10 border border-green/20 text-green hover:bg-green/20 rounded-xl px-4"
            onClick={openCreate}
          >
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>

          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-2">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[60px] w-[100px] rounded-xl shrink-0" />
                ))
              ) : (
                agents.map((agent) => (
                  <AgentListItem
                    key={agent.id}
                    agent={agent}
                    isSelected={agent.id === selectedAgentId}
                    onClick={() => setSelectedAgentId(agent.id)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom: Chat + Detail Split ─── */}
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {selectedAgent ? (
          <>
            {/* Left: Chat */}
            <div className="w-[38%] shrink-0 min-w-0">
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
            </div>

            {/* Right: Detail/Skills */}
            <div className="flex-1 min-h-0">
              <AgentDetailPanel
                agent={selectedAgent}
                skills={skills}
                agentSkills={agentSkills}
                onAssignSkill={handleAssignSkill}
                onRemoveSkill={handleRemoveSkill}
                onEdit={() => openEdit(selectedAgent)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-lg font-medium text-white/40 mb-1">No agent selected</h3>
              <p className="text-sm text-white/20 mb-4">Select an agent above or create one</p>
              <Button className="bg-green text-dark hover:bg-green-light" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Create Agent
              </Button>
            </div>
          </div>
        )}
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
