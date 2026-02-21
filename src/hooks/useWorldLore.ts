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

const CHUNK_SIZE = 2000;
const CHUNK_OVERLAP = 200;

function chunkText(text: string): { text: string; index: number }[] {
  if (text.length <= CHUNK_SIZE) return [{ text, index: 0 }];
  const chunks: { text: string; index: number }[] = [];
  let start = 0, idx = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const pb = text.lastIndexOf('\n\n', end);
      if (pb > start + CHUNK_SIZE * 0.5) end = pb + 2;
      else { const sb = text.lastIndexOf('. ', end); if (sb > start + CHUNK_SIZE * 0.5) end = sb + 2; }
    }
    const s = text.slice(start, end).trim();
    if (s.length >= 100) chunks.push({ text: s, index: idx++ });
    start = end - CHUNK_OVERLAP;
    if (start >= text.length) break;
  }
  return chunks;
}

export function useExtractLoreText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { entryId: string; file?: File }) => {
      const entryId = typeof input === 'string' ? input : input.entryId;
      const file = typeof input === 'string' ? undefined : input.file;

      // Step 1: Extract text — send file base64 directly if available
      const extractBody: Record<string, unknown> = { entryId };

      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        extractBody.fileBase64 = btoa(binary);
        extractBody.fileName = file.name;
        extractBody.fileType = file.type;
      }

      const { data: extractData, error: extractErr } = await supabase.functions.invoke('extract-lore-text', {
        body: extractBody,
      });
      if (extractErr) throw extractErr;
      if (extractData?.error) throw new Error(extractData.error);

      // Step 2: Get the content for chunking
      const { data: entry } = await supabase.from('world_lore_entries').select('content, title, entry_type, storage_path').eq('id', entryId).single();
      if (!entry?.content) return { ...extractData, chunksIndexed: 0, totalChunks: 0 };

      // Step 3: Chunk client-side and send to embed-lore with storeOnly=true
      const allChunks = chunkText(entry.content);
      const BATCH = 2;
      let totalIndexed = 0;

      for (let i = 0; i < allChunks.length; i += BATCH) {
        const batch = allChunks.slice(i, i + BATCH);
        try {
          const { data: embedData } = await supabase.functions.invoke('embed-lore', {
            body: { entryId, chunks: batch, clearExisting: i === 0, storeOnly: true },
          });
          totalIndexed += embedData?.chunksIndexed ?? 0;
        } catch (e) {
          console.warn(`[embed-lore] Batch ${i} failed:`, e);
        }
        if (i + BATCH < allChunks.length) await new Promise(r => setTimeout(r, 300));
      }

      return {
        ...extractData,
        chunksIndexed: totalIndexed,
        totalChunks: allChunks.length,
        entryTitle: entry.title,
        entryType: entry.entry_type,
        storagePath: entry.storage_path,
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['lore-chunk-counts'] });
      qc.invalidateQueries({ queryKey: ['fragments'] });
      const chunks = data?.chunksIndexed ?? 0;
      toast.success(chunks > 0 ? `Extracted ${chunks} chunks — ready to decipher!` : 'Document text extracted');
    },
    onError: (err: Error) => toast.error(`Text extraction failed: ${err.message}`),
  });
}

export function useLoreChunkCounts() {
  return useQuery({
    queryKey: ['lore-chunk-counts'],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('lore_embeddings')
        .select('entry_id');
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        counts[row.entry_id] = (counts[row.entry_id] ?? 0) + 1;
      }
      return counts;
    },
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
