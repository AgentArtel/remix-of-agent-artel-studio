import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface WorldLoreEntry {
  id: string;
  title: string;
  entry_type: string;
  content: string | null;
  storage_path: string | null;
  file_name: string | null;
  file_type: string | null;
  summary: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['world-lore-entries'] as const;

export function useWorldLoreEntries() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<WorldLoreEntry[]> => {
      const { data, error } = await supabase
        .from('world_lore_entries')
        .select('*')
        .neq('entry_type', 'knowledge_graph')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as WorldLoreEntry[]) ?? [];
    },
  });
}

export function useCreateLoreEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      entry_type: string;
      content?: string;
      file?: File;
    }): Promise<WorldLoreEntry> => {
      let storage_path: string | null = null;
      let file_name: string | null = null;
      let file_type: string | null = null;

      if (input.file) {
        const ext = input.file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('world-lore')
          .upload(path, input.file);
        if (uploadErr) throw uploadErr;
        storage_path = path;
        file_name = input.file.name;
        file_type = input.file.type;
      }

      const { data, error } = await supabase
        .from('world_lore_entries')
        .insert({
          title: input.title,
          entry_type: input.entry_type,
          content: input.content ?? null,
          storage_path,
          file_name,
          file_type,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WorldLoreEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Lore entry added');
    },
    onError: (err: Error) => toast.error(`Upload failed: ${err.message}`),
  });
}

export function useDeleteLoreEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: WorldLoreEntry) => {
      if (entry.storage_path) {
        await supabase.storage.from('world-lore').remove([entry.storage_path]);
      }
      const { error } = await supabase
        .from('world_lore_entries')
        .delete()
        .eq('id', entry.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Lore entry deleted');
    },
    onError: (err: Error) => toast.error(`Delete failed: ${err.message}`),
  });
}
