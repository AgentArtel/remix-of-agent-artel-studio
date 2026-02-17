
CREATE TABLE public.object_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📦',
  description TEXT,
  actions JSONB DEFAULT '{}'::jsonb,
  category TEXT NOT NULL DEFAULT 'object',
  base_entity_type TEXT NOT NULL DEFAULT 'object',
  default_sprite TEXT,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.object_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read all" ON public.object_templates FOR SELECT USING (true);
CREATE POLICY "Allow admin all" ON public.object_templates FOR ALL USING (true) WITH CHECK (true);
