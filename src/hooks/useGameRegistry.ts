import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GameRegistryEntry {
  id: string;
  registry_type: string;
  key: string;
  label: string;
  metadata: Record<string, any>;
  is_active: boolean;
  updated_at: string;
}

export const GAME_REGISTRY_KEY = ['game_registry'];

export function useGameRegistry(type: string) {
  return useQuery<GameRegistryEntry[]>({
    queryKey: [...GAME_REGISTRY_KEY, type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_registry' as any)
        .select('*')
        .eq('registry_type', type)
        .eq('is_active', true)
        .order('label');
      if (error) throw error;
      return (data ?? []) as unknown as GameRegistryEntry[];
    },
    staleTime: 60_000, // game data changes infrequently
  });
}
