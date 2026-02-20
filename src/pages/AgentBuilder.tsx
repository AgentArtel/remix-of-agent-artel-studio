import React, { useState, useCallback } from 'react';
import { AgentListItem } from '@/components/agents/AgentListItem';
import { AgentDetailPanel } from '@/components/agents/AgentDetailPanel';
import { AgentFormModal } from '@/components/agents/AgentFormModal';
import { AgentChatTest } from '@/components/agents/AgentChatTest';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
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
  const [searchQuery, setSearchQuery] = useState('');
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

  const filtered = agents.filter((a) =>
    a.picoclaw_agent_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="min-h-screen bg-dark text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agents</h1>
          <p className="text-white/50 mt-1">Build and manage PicoClaw AI agents</p>
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
              <p className="text-white/20 text-sm">Select an agent to start chatting</p>
            </div>
          )}
        </div>

        {/* Right — Agents grid + Detail panel */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Top: Agent selection grid */}
          <div>
            <div className="mb-3">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search agents..."
                className="max-w-sm"
              />
            </div>
            <div className="max-h-[260px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : filtered.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {filtered.map((agent) => (
                    <AgentListItem
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentId === agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No agents yet"
                  description="Create your first PicoClaw agent"
                  icon={<Bot className="w-8 h-8" />}
                  actionLabel="Create Agent"
                  onAction={openCreate}
                />
              )}
            </div>
          </div>

          {/* Bottom: Detail / config panel */}
          {selectedAgent ? (
            <div className="flex-1 min-h-[300px]">
              <AgentDetailPanel
                agent={selectedAgent}
                skills={skills}
                agentSkills={agentSkills}
                onAssignSkill={handleAssignSkill}
                onRemoveSkill={handleRemoveSkill}
                onEdit={() => openEdit(selectedAgent)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-dark-200 rounded-xl border border-white/5">
              <p className="text-white/20 text-sm">Select an agent to view details</p>
            </div>
          )}
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
