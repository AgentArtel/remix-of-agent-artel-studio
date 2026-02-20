import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type AgentConfig = Tables<'agent_configs'>;

export const AGENT_CONFIGS_KEY = ['game-agent-configs'] as const;

export function useAgentConfigs() {
  return useQuery({
    queryKey: AGENT_CONFIGS_KEY,
    queryFn: async (): Promise<AgentConfig[]> => {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
}
