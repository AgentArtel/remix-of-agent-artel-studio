import React, { useState, useCallback, useEffect } from 'react';
import { AgentFormModal } from '@/components/agents/AgentFormModal';
import { AgentChatTest } from '@/components/agents/AgentChatTest';
import { AgentListItem } from '@/components/agents/AgentListItem';
import { SearchBar } from '@/components/workflow/SearchBar';
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
  const { data: agentSkills = [] } = useAgentSkills(editingAgent?.id ?? null);
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

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? null;

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
      if (!editingAgent) return;
      assignSkillMutation.mutate({ agentId: editingAgent.id, skillId });
    },
    [editingAgent, assignSkillMutation],
  );

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      if (!editingAgent) return;
      removeSkillMutation.mutate({ agentId: editingAgent.id, skillId });
    },
    [editingAgent, removeSkillMutation],
  );

  const filtered = agents.filter((a) =>
    a.picoclaw_agent_id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-dark text-white">
      {/* ─── Left: Agent List ─── */}
      <div className="w-72 shrink-0 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/70">Agents</h2>
            <Button size="sm" className="h-7 bg-green text-dark hover:bg-green-light text-xs" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 mr-1" /> New
            </Button>
          </div>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search..."
            className="w-full"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))
          ) : filtered.length > 0 ? (
            filtered.map((agent) => (
              <AgentListItem
                key={agent.id}
                agent={agent}
                isSelected={agent.id === selectedAgentId}
                skillCount={allSkillCounts[agent.id] || 0}
                onClick={() => setSelectedAgentId(agent.id)}
              />
            ))
          ) : (
            <p className="text-xs text-white/30 text-center py-6">No agents found</p>
          )}
        </div>
      </div>

      {/* ─── Right: Chat Area ─── */}
      <div className="flex-1 flex flex-col p-4">
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-lg font-medium text-white/40 mb-1">No agent selected</h3>
              <p className="text-sm text-white/20 mb-4">Select an agent from the sidebar or create one</p>
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
