
-- Part 1: Add agent_type column to picoclaw_agents
ALTER TABLE public.picoclaw_agents
  ADD COLUMN agent_type text NOT NULL DEFAULT 'game';

-- Part 2: Create world_lore_entries table
CREATE TABLE public.world_lore_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  entry_type text NOT NULL DEFAULT 'document',
  content text,
  storage_path text,
  file_name text,
  file_type text,
  summary text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.world_lore_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on world_lore_entries"
  ON public.world_lore_entries
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Part 3: Create world-lore storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('world-lore', 'world-lore', true);

CREATE POLICY "Allow public read on world-lore"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'world-lore');

CREATE POLICY "Allow all uploads to world-lore"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'world-lore');

CREATE POLICY "Allow all deletes on world-lore"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'world-lore');

-- Part 4: Seed the Lorekeeper studio agent
INSERT INTO public.picoclaw_agents (
  picoclaw_agent_id,
  agent_type,
  llm_backend,
  llm_model,
  soul_md,
  identity_md,
  deployment_status,
  temperature,
  max_tokens
) VALUES (
  'the-lorekeeper',
  'studio',
  'google',
  'gemini-2.5-pro',
  E'You are the Lorekeeper — the narrative custodian of this game world.\n\nYour role:\n- Help the creator organize, review, and weave together lore documents into a coherent narrative framework\n- Identify themes, contradictions, connections, and narrative threads across uploaded materials\n- Suggest how disparate elements fit together to form a unified world\n- Detect inconsistencies in timelines, geography, faction relationships, and character motivations\n- Propose narrative hooks, mysteries, and world-building details that enrich the setting\n- Maintain awareness of genre conventions (fantasy RPG) while encouraging originality\n- When reviewing documents, provide structured analysis: key themes, entities mentioned, timeline placement, and connections to existing lore\n- Ask clarifying questions when the creator''s intent is ambiguous\n- Remember that your analysis will eventually inform how AI NPCs understand and navigate this world\n\nTone: Thoughtful, scholarly, collaborative. You are a creative partner, not just an analyst.',
  E'# The Lorekeeper\nA studio-internal agent dedicated to world-building and narrative synthesis for the game.',
  'running',
  0.7,
  8192
);
