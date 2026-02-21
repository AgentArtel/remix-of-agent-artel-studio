
-- Add columns to fragment_archive for deciphering progress
ALTER TABLE public.fragment_archive
  ADD COLUMN IF NOT EXISTS total_chunks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revealed_chunks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lore_entry_id uuid REFERENCES public.world_lore_entries(id) ON DELETE SET NULL;

-- Add is_revealed column to lore_embeddings
ALTER TABLE public.lore_embeddings
  ADD COLUMN IF NOT EXISTS is_revealed boolean NOT NULL DEFAULT true;

-- Update match_lore_chunks to only return revealed chunks
CREATE OR REPLACE FUNCTION public.match_lore_chunks(
  query_embedding extensions.vector,
  match_count integer DEFAULT 8,
  match_threshold double precision DEFAULT 0.3
)
RETURNS TABLE(
  id uuid,
  entry_id uuid,
  chunk_text text,
  chunk_index integer,
  similarity double precision,
  entry_title text,
  entry_type text
)
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
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
  WHERE le.is_revealed = true
    AND 1 - (le.embedding <=> query_embedding) > match_threshold
  ORDER BY le.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
