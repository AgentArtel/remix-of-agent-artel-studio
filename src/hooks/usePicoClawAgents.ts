import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PicoClawAgent {
  id: string;
  agent_config_id: string | null;
  picoclaw_agent_id: string;
  soul_md: string;
  identity_md: string;
  user_md: string;
  agents_md: string;
  llm_backend: string;
  llm_model: string;
  fallback_models: string[];
  temperature: number;
  max_tokens: number;
  max_tool_iterations: number;
  memory_enabled: boolean;
  long_term_memory_enabled: boolean;
  channel: string | null;
  guild_id: string | null;
  parent_agent_id: string | null;
  allowed_subagents: string[];
  heartbeat_interval_seconds: number | null;
  cron_schedules: any[];
  deployment_status: 'draft' | 'running' | 'stopped' | 'error';
  last_deployed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface PicoClawSkill {
  id: string;
  name: string;
  slug: string;
  description: string;
  skill_md: string;
  tools: any[];
  category: string;
  is_builtin: boolean;
  created_at: string;
}

export interface PicoClawAgentSkill {
  agent_id: string;
  skill_id: string;
  config_overrides: Record<string, unknown>;
  skill?: PicoClawSkill;
}

export type CreateAgentInput = {
  picoclaw_agent_id: string;
  agent_config_id?: string;
  soul_md?: string;
  identity_md?: string;
  user_md?: string;
  agents_md?: string;
  llm_backend?: string;
  llm_model?: string;
  temperature?: number;
  max_tokens?: number;
  max_tool_iterations?: number;
  memory_enabled?: boolean;
  long_term_memory_enabled?: boolean;
};

import { AGENT_CONFIGS_KEY } from '@/hooks/useAgentConfigs';

const QUERY_KEY = ['picoclaw-agents'] as const;
const SKILLS_KEY = ['picoclaw-skills'] as const;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function usePicoClawAgents() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<PicoClawAgent[]> => {
      const { data, error } = await supabase
        .from('picoclaw_agents')
        .select('*')
        .filter('agent_type', 'eq', 'game')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as PicoClawAgent[]) || [];
    },
  });
}

export function usePicoClawAgent(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async (): Promise<PicoClawAgent | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('picoclaw_agents')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as PicoClawAgent;
    },
    enabled: !!id,
  });
}

export function usePicoClawSkills() {
  return useQuery({
    queryKey: SKILLS_KEY,
    queryFn: async (): Promise<PicoClawSkill[]> => {
      const { data, error } = await supabase
        .from('picoclaw_skills')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return (data as unknown as PicoClawSkill[]) || [];
    },
  });
}

export function useAgentSkills(agentId: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, agentId, 'skills'],
    queryFn: async (): Promise<PicoClawAgentSkill[]> => {
      if (!agentId) return [];
      const { data, error } = await supabase
        .from('picoclaw_agent_skills')
        .select('*, skill:picoclaw_skills(*)')
        .eq('agent_id', agentId);
      if (error) throw error;
      return (data as unknown as PicoClawAgentSkill[]) || [];
    },
    enabled: !!agentId,
  });
}

export function useAllAgentSkillCounts() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'all-skill-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('picoclaw_agent_skills')
        .select('agent_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of (data as unknown as { agent_id: string }[]) || []) {
        counts[row.agent_id] = (counts[row.agent_id] || 0) + 1;
      }
      return counts;
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAgentInput) => {
      const { data, error } = await supabase
        .from('picoclaw_agents')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PicoClawAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Agent created');
    },
    onError: (err: Error) => toast.error(`Failed to create agent: ${err.message}`),
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PicoClawAgent> & { id: string }) => {
      const { data, error } = await supabase
        .from('picoclaw_agents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PicoClawAgent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Agent updated');
    },
    onError: (err: Error) => toast.error(`Failed to update agent: ${err.message}`),
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('picoclaw_agents')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Agent deleted');
    },
    onError: (err: Error) => toast.error(`Failed to delete agent: ${err.message}`),
  });
}

export function useAssignSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, skillId }: { agentId: string; skillId: string }) => {
      const { error } = await supabase
        .from('picoclaw_agent_skills')
        .insert({ agent_id: agentId, skill_id: skillId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => toast.error(`Failed to assign skill: ${err.message}`),
  });
}

export function useRemoveSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, skillId }: { agentId: string; skillId: string }) => {
      const { error } = await supabase
        .from('picoclaw_agent_skills')
        .delete()
        .eq('agent_id', agentId)
        .eq('skill_id', skillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err: Error) => toast.error(`Failed to remove skill: ${err.message}`),
  });
}

// ---------------------------------------------------------------------------
// Game entity link hooks
// ---------------------------------------------------------------------------

export function useLinkAgentToGameEntity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ agentId, agentConfigId }: { agentId: string; agentConfigId: string | null }) => {
      const { data, error } = await supabase
        .from('picoclaw_agents')
        .update({ agent_config_id: agentConfigId, updated_at: new Date().toISOString() })
        .eq('id', agentId)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PicoClawAgent;
    },
    onSuccess: (_data, { agentConfigId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: AGENT_CONFIGS_KEY });
      toast.success(agentConfigId ? 'Agent linked to game entity' : 'Agent unlinked from game entity');
    },
    onError: (err: Error) => toast.error(`Failed to link agent: ${err.message}`),
  });
}

export function useAgentConfigLinks() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'config-links'],
    queryFn: async (): Promise<Record<string, PicoClawAgent>> => {
      const { data, error } = await supabase
        .from('picoclaw_agents')
        .select('*')
        .not('agent_config_id', 'is', null);
      if (error) throw error;
      const map: Record<string, PicoClawAgent> = {};
      for (const agent of (data as unknown as PicoClawAgent[]) || []) {
        if (agent.agent_config_id) {
          map[agent.agent_config_id] = agent;
        }
      }
      return map;
    },
  });
}

// ---------------------------------------------------------------------------
// Bridge actions (deploy, stop, chat, status)
// ---------------------------------------------------------------------------

async function callBridge(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('picoclaw-bridge', { body });
  if (error) throw error;
  return data;
}

export function useDeployAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      return await callBridge({ action: 'deploy', agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Agent deployed');
    },
    onError: (err: Error) => toast.error(`Deploy failed: ${err.message}`),
  });
}

export function useStopAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      return await callBridge({ action: 'stop', agentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Agent stopped');
    },
    onError: (err: Error) => toast.error(`Stop failed: ${err.message}`),
  });
}

export function useChatWithAgent() {
  return useMutation({
    mutationFn: async ({
      agentId,
      message,
      sessionId,
    }: {
      agentId: string;
      message: string;
      sessionId?: string;
    }) => {
      const result = await callBridge({ action: 'chat', agentId, message, sessionId });
      return result as { success: boolean; response: string; session_key: string };
    },
    onError: (err: Error) => toast.error(`Chat failed: ${err.message}`),
  });
}

export function useGatewayStatus() {
  return useQuery({
    queryKey: ['picoclaw-gateway-status'],
    queryFn: async () => {
      return await callBridge({ action: 'status' });
    },
    refetchInterval: 30_000,
  });
}
