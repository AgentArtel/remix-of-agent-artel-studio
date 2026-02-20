import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { AgentCard } from '@/components/agents/AgentCard';
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
  type CreateAgentInput } from
'@/hooks/usePicoClawAgents';

interface AgentBuilderProps {
  onNavigate: (page: string) => void;
}

export const AgentBuilder: React.FC<AgentBuilderProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<PicoClawAgent | null>(null);
  const [testingAgentId, setTestingAgentId] = useState<string | null>(null);

  // Data
  const { data: agents = [], isLoading } = usePicoClawAgents();
  const { data: skills = [] } = usePicoClawSkills();
  const { data: agentSkills = [] } = useAgentSkills(editingAgent?.id ?? null);
  const { data: allSkillCounts = {} } = useAllAgentSkillCounts();

  // Mutations
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();
  const deployMutation = useDeployAgent();
  const stopMutation = useStopAgent();
  const assignSkillMutation = useAssignSkill();
  const removeSkillMutation = useRemoveSkill();

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
    },
    [deleteMutation]
  );

  const handleSave = useCallback(
    (data: CreateAgentInput | (Partial<PicoClawAgent> & {id: string;})) => {
      if ('id' in data && data.id) {
        updateMutation.mutate(data as Partial<PicoClawAgent> & {id: string;}, {
          onSuccess: () => {
            setIsModalOpen(false);
            setEditingAgent(null);
          }
        });
      } else {
        createMutation.mutate(data as CreateAgentInput, {
          onSuccess: () => {
            setIsModalOpen(false);
          }
        });
      }
    },
    [createMutation, updateMutation]
  );

  const handleDeploy = useCallback(
    (id: string) => {
      deployMutation.mutate(id);
    },
    [deployMutation]
  );

  const handleStop = useCallback(
    (id: string) => {
      stopMutation.mutate(id);
    },
    [stopMutation]
  );

  const handleAssignSkill = useCallback(
    (skillId: string) => {
      if (!editingAgent) return;
      assignSkillMutation.mutate({ agentId: editingAgent.id, skillId });
    },
    [editingAgent, assignSkillMutation]
  );

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      if (!editingAgent) return;
      removeSkillMutation.mutate({ agentId: editingAgent.id, skillId });
    },
    [editingAgent, removeSkillMutation]
  );

  const filtered = agents.filter((a) =>
  a.picoclaw_agent_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const testingAgent = testingAgentId ? agents.find((a) => a.id === testingAgentId) : null;

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agents</h1>
          <p className="text-white/50 mt-1">
            Build and manage PicoClaw AI agents
          </p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Create Agent
        </Button>
      </div>

      <div className="mb-6 my-[300px]">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search agents..."
          className="max-w-md" />

      </div>

      <div className="flex gap-6">
        {/* Agent Grid */}
        <div className="flex-1">
          {isLoading ?
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, i) =>
            <Skeleton key={i} className="h-44 rounded-2xl" />
            )}
            </div> :
          filtered.length > 0 ?
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((agent) =>
            <AgentCard
              key={agent.id}
              name={agent.picoclaw_agent_id}
              agentSlug={agent.picoclaw_agent_id}
              llmBackend={agent.llm_backend}
              llmModel={agent.llm_model}
              status={agent.deployment_status}
              skillCount={allSkillCounts[agent.id] || 0}
              onEdit={() => openEdit(agent)}
              onDelete={() => handleDelete(agent.id)}
              onDeploy={() => handleDeploy(agent.id)}
              onStop={() => handleStop(agent.id)}
              onTest={() => setTestingAgentId(agent.id)} />

            )}
            </div> :

          <EmptyState
            title="No agents yet"
            description="Create your first PicoClaw agent to get started"
            icon={<Bot className="w-8 h-8" />}
            actionLabel="Create Agent"
            onAction={openCreate} />

          }
        </div>

        {/* Chat Test Panel */}
        {testingAgent &&
        <div className="w-[400px] shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white/60">Test Chat</h3>
              <button
              onClick={() => setTestingAgentId(null)}
              className="text-xs text-white/40 hover:text-white">

                Close
              </button>
            </div>
            <AgentChatTest
            agentId={testingAgent.id}
            agentName={testingAgent.picoclaw_agent_id} />

          </div>
        }
      </div>

      <AgentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAgent(null);
        }}
        onSave={handleSave}
        initialData={editingAgent}
        skills={skills}
        assignedSkillIds={agentSkills.map((as) => as.skill_id)}
        onAssignSkill={handleAssignSkill}
        onRemoveSkill={handleRemoveSkill} />

    </div>);

};