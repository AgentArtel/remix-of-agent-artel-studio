-- B-0: n8n_webhook_registry
CREATE TABLE IF NOT EXISTS public.n8n_webhook_registry (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action_key TEXT NOT NULL UNIQUE,
  webhook_url TEXT NOT NULL,
  method TEXT DEFAULT 'POST',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  timeout_ms INTEGER DEFAULT 30000,
  response_mode TEXT DEFAULT 'sync',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.n8n_webhook_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to n8n_webhook_registry"
  ON public.n8n_webhook_registry
  FOR ALL
  USING (true)
  WITH CHECK (true);

INSERT INTO public.n8n_webhook_registry (action_key, webhook_url, description, is_active) VALUES
  ('mailbox.fetch_emails', 'https://placeholder.invalid/webhook/mailbox-fetch', 'Fetch Gmail inbox for player', false),
  ('mailbox.send_email',   'https://placeholder.invalid/webhook/mailbox-send',  'Send email via Gmail',         false),
  ('desk.process_mail',    'https://placeholder.invalid/webhook/desk-process',  'Process/tag unread emails',    false),
  ('desk.check_desk',      'https://placeholder.invalid/webhook/desk-check',    'Check desk status',            false),
  ('studio.run_workflow',  'https://placeholder.invalid/webhook/studio-run',    'Run a studio workflow via n8n', false)
ON CONFLICT (action_key) DO NOTHING;

-- B-3: workflow_templates
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  run_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to workflow_templates"
  ON public.workflow_templates
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_workflow_templates_user ON public.workflow_templates(user_id);

-- B-5: workflow_schedules
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  schedule_type TEXT NOT NULL,
  cron_expression TEXT,
  interval_minutes INTEGER,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  npc_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to workflow_schedules"
  ON public.workflow_schedules
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next ON public.workflow_schedules(next_run_at)
  WHERE is_active = true;

-- Seed Archivist and Butler object templates
INSERT INTO public.object_templates (id, name, category, base_entity_type, default_sprite, icon, description, is_enabled)
VALUES
  ('archivist', 'Archivist', 'object', 'scripted-object', 'female', '📜', 'Records and saves your workflow sequences', true),
  ('butler',    'Butler',    'object', 'scripted-object', 'male',   '🎩', 'Runs and schedules your saved workflows',  true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_enabled = true;