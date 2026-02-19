-- B-3: workflow_templates
-- Stores sequences of object-action steps recorded in-game by the player.

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

-- Step schema (each element of the steps JSONB array):
-- {
--   "order": 1,
--   "object_type": "mailbox",
--   "action": "fetch_emails",
--   "params": {},
--   "expected_inputs": [],
--   "credentials_ref": "google"
-- }


-- B-5: workflow_schedules
-- Associates a workflow template with a recurring schedule and optional NPC persona.

CREATE TABLE IF NOT EXISTS public.workflow_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  schedule_type TEXT NOT NULL,          -- 'cron' | 'interval' | 'once'
  cron_expression TEXT,                 -- e.g. '0 9 * * *' for daily at 9am
  interval_minutes INTEGER,             -- for 'interval' type
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  npc_id TEXT,                          -- optional: NPC/object persona for this schedule
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
