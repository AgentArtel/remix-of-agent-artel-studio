import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GAME_REGISTRY_KEY, type GameRegistryEntry } from './useGameRegistry';

const SPRITE_REGISTRY_KEY = [...GAME_REGISTRY_KEY, 'sprite'];

export interface SpriteEntry extends GameRegistryEntry {
  metadata: {
    imageDataUrl?: string;
    width?: number;
    height?: number;
    source?: string;
  };
}

export function useSpriteRegistry() {
  const queryClient = useQueryClient();

  const query = useQuery<SpriteEntry[]>({
    queryKey: SPRITE_REGISTRY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_registry' as any)
        .select('*')
        .eq('registry_type', 'sprite')
        .order('label');
      if (error) throw error;
      return (data ?? []) as unknown as SpriteEntry[];
    },
    staleTime: 30_000,
  });

  const createSprite = useMutation({
    mutationFn: async (params: {
      key: string;
      label: string;
      imageDataUrl: string;
      width: number;
      height: number;
    }) => {
      const { data, error } = await supabase
        .from('game_registry' as any)
        .insert({
          registry_type: 'sprite',
          key: params.key,
          label: params.label,
          is_active: true,
          metadata: {
            imageDataUrl: params.imageDataUrl,
            width: params.width,
            height: params.height,
            source: 'lpc-generator',
          },
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPRITE_REGISTRY_KEY });
      // Also invalidate the general sprite query used by NPC form
      queryClient.invalidateQueries({ queryKey: [...GAME_REGISTRY_KEY, 'sprite'] });
    },
  });

  const deleteSprite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('game_registry' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPRITE_REGISTRY_KEY });
      queryClient.invalidateQueries({ queryKey: [...GAME_REGISTRY_KEY, 'sprite'] });
    },
  });

  return {
    sprites: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSprite,
    deleteSprite,
  };
}
