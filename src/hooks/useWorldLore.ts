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

export interface LoreChunkMatch {
  id: string;
  entry_id: string;
  chunk_text: string;
  chunk_index: number;
  similarity: number;
  entry_title: string;
  entry_type: string;
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

export function useExtractLoreText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryId: string) => {
      // Step 1: Extract text
      const { data: extractData, error: extractErr } = await supabase.functions.invoke('extract-lore-text', {
        body: { entryId },
      });
      if (extractErr) throw extractErr;
      if (extractData?.error) throw new Error(extractData.error);

      // Step 2: Embed chunks (separate lightweight function)
      try {
        const { data: embedData } = await supabase.functions.invoke('embed-lore', {
          body: { entryId },
        });
        return { ...extractData, chunksIndexed: embedData?.chunksIndexed ?? 0 };
      } catch (e) {
        console.warn('Embedding step failed:', e);
        return extractData;
      }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      const chunks = data?.chunksIndexed ?? 0;
      toast.success(chunks > 0 ? `Extracted & indexed ${chunks} chunks` : 'Document text extracted');
    },
    onError: (err: Error) => toast.error(`Text extraction failed: ${err.message}`),
  });
}

/**
 * Search lore chunks via RAG (vector similarity).
 * Calls the match_lore_chunks database function with an embedding of the query.
 */
export async function searchLoreChunks(queryText: string, matchCount = 8): Promise<LoreChunkMatch[]> {
  // 1. Embed the query text
  const { data: embedData, error: embedErr } = await supabase.functions.invoke('gemini-embed', {
    body: { text: queryText },
  });

  if (embedErr || !embedData?.success || !embedData?.embeddings?.[0]) {
    console.error('[searchLoreChunks] Embedding failed:', embedErr || embedData);
    return [];
  }

  const queryEmbedding = embedData.embeddings[0];

  // 2. Call the match function
  const { data, error } = await supabase.rpc('match_lore_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: matchCount,
    match_threshold: 0.3,
  });

  if (error) {
    console.error('[searchLoreChunks] RPC error:', error);
    return [];
  }

  return (data as unknown as LoreChunkMatch[]) ?? [];
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
