
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Create lore_embeddings table for RAG chunks
CREATE TABLE public.lore_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id UUID NOT NULL REFERENCES public.world_lore_entries(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding extensions.vector(768),
  token_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX idx_lore_embeddings_vector 
  ON public.lore_embeddings USING hnsw (embedding extensions.vector_cosine_ops);

-- Index for looking up chunks by entry
CREATE INDEX idx_lore_embeddings_entry 
  ON public.lore_embeddings(entry_id);

-- Enable RLS
ALTER TABLE public.lore_embeddings ENABLE ROW LEVEL SECURITY;

-- Permissive policy matching other tables in this project
CREATE POLICY "Allow all on lore_embeddings"
  ON public.lore_embeddings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to search for similar lore chunks
CREATE OR REPLACE FUNCTION public.match_lore_chunks(
  query_embedding extensions.vector(768),
  match_count INT DEFAULT 8,
  match_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  entry_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  entry_title TEXT,
  entry_type TEXT
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    le.id,
    le.entry_id,
    le.chunk_text,
    le.chunk_index,
    1 - (le.embedding <=> query_embedding)::FLOAT AS similarity,
    wle.title AS entry_title,
    wle.entry_type
  FROM public.lore_embeddings le
  JOIN public.world_lore_entries wle ON wle.id = le.entry_id
  WHERE 1 - (le.embedding <=> query_embedding) > match_threshold
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
