import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface Fragment {
  id: string;
  title: string;
  fragment_type: string;
  certainty_level: string;
  total_chunks: number;
  revealed_chunks: number;
  lore_entry_id: string | null;
  storage_path: string | null;
  raw_content: string | null;
  player_id: string;
  is_processed: boolean;
  tags: unknown[];
  created_at: string;
  updated_at: string;
}

export interface DecipherResult {
  success: boolean;
  revealedTexts: string[];
  progress: {
    revealed: number;
    total: number;
    certainty: string;
  };
  message?: string;
}

const QUERY_KEY = ['fragments'] as const;

export function useFragments() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Fragment[]> => {
      const { data, error } = await supabase
        .from('fragment_archive')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as Fragment[]) ?? [];
    },
  });
}

export function useDecipherFragment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      fragmentId,
      chunksToReveal = 3,
    }: {
      fragmentId: string;
      chunksToReveal?: number;
    }): Promise<DecipherResult> => {
      const { data, error } = await supabase.functions.invoke('decipher-fragment', {
        body: { fragmentId, chunksToReveal },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as DecipherResult;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['lore-chunk-counts'] });
      const count = data.revealedTexts?.length ?? 0;
      if (count > 0) {
        toast.success(`Deciphered ${count} fragment${count > 1 ? 's' : ''}! Certainty: ${data.progress.certainty}`);
      } else {
        toast.info(data.message || 'Fragment fully deciphered');
      }
    },
    onError: (err: Error) => toast.error(`Decipher failed: ${err.message}`),
  });
}

/**
 * Create a sealed fragment linked to a lore entry.
 * Called after text extraction + chunk insertion.
 */
export function useCreateFragment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      fragment_type: string;
      lore_entry_id: string;
      total_chunks: number;
      player_id?: string;
      storage_path?: string | null;
    }): Promise<Fragment> => {
      // Check if fragment already exists for this lore entry
      const { data: existing } = await supabase
        .from('fragment_archive')
        .select('id')
        .eq('lore_entry_id', input.lore_entry_id as any)
        .maybeSingle();

      if (existing) {
        // Update existing fragment
        const { data, error } = await supabase
          .from('fragment_archive')
          .update({
            total_chunks: input.total_chunks,
            certainty_level: 'sealed',
            revealed_chunks: 0,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as Fragment;
      }

      const { data, error } = await supabase
        .from('fragment_archive')
        .insert({
          title: input.title,
          fragment_type: input.fragment_type,
          lore_entry_id: input.lore_entry_id as any,
          total_chunks: input.total_chunks,
          revealed_chunks: 0,
          certainty_level: 'sealed',
          player_id: input.player_id || 'studio-user',
          storage_path: input.storage_path || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Fragment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
