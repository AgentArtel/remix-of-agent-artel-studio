
-- 1. Create fragment_archive table
CREATE TABLE public.fragment_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id TEXT NOT NULL,
  title TEXT NOT NULL,
  fragment_type TEXT NOT NULL DEFAULT 'text',
  storage_path TEXT,
  raw_content TEXT,
  analysis JSONB DEFAULT '{}'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  connections JSONB DEFAULT '[]'::jsonb,
  certainty_level TEXT NOT NULL DEFAULT 'speculative',
  is_processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fragment_archive ENABLE ROW LEVEL SECURITY;

-- Permissive allow-all policy (matching dev pattern)
CREATE POLICY "Allow all on fragment_archive"
  ON public.fragment_archive
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. Create fragments storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fragments', 'fragments', true);

-- Storage policy: anyone can read
CREATE POLICY "Public read fragments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fragments');

-- Storage policy: anyone can upload (dev mode)
CREATE POLICY "Allow upload fragments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fragments');

-- Storage policy: anyone can update (dev mode)
CREATE POLICY "Allow update fragments"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'fragments');

-- Storage policy: anyone can delete (dev mode)
CREATE POLICY "Allow delete fragments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'fragments');
