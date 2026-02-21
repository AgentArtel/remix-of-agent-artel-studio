
CREATE TABLE public.studio_agent_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  session_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.studio_agent_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on studio_agent_memory"
  ON public.studio_agent_memory
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_studio_agent_memory_lookup
  ON public.studio_agent_memory (agent_id, session_id, created_at DESC);
