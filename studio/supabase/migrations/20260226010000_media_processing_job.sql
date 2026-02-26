-- Media Processing Job: object_instances table + task-board/media-processor templates + registry entries
-- This migration enables the first "job" system and the generic action handler pattern.

---------------------------------------------------------------------------
-- 1. object_instances table (referenced by objectSpawner.ts + Studio hooks but never created)
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.object_instances (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES public.object_templates(id) ON DELETE CASCADE,
  map_id      TEXT NOT NULL,
  position    JSONB NOT NULL DEFAULT '{"x":0,"y":0}',
  custom_name TEXT,
  custom_config JSONB DEFAULT '{}'::jsonb,
  is_enabled  BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.object_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to object_instances"
  ON public.object_instances FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_object_instances_map
  ON public.object_instances(map_id) WHERE is_enabled = true;

---------------------------------------------------------------------------
-- 2. Seed task-board template
---------------------------------------------------------------------------
INSERT INTO public.object_templates (id, name, category, base_entity_type, default_sprite, icon, description, actions, is_enabled)
VALUES (
  'task-board',
  'Task Board',
  'object',
  'scripted-object',
  'female',
  '📋',
  'Pick up media processing tasks and turn them in for gold',
  '{
    "assign_task": {
      "description": "Take a new task",
      "inputs": [],
      "outputs": ["entry_id"]
    },
    "turn_in_task": {
      "description": "Turn in completed task",
      "inputs": ["entry_id"],
      "outputs": ["reward_gold"]
    }
  }'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  actions = EXCLUDED.actions,
  description = EXCLUDED.description,
  is_enabled = true;

---------------------------------------------------------------------------
-- 3. Seed media-processor template
---------------------------------------------------------------------------
INSERT INTO public.object_templates (id, name, category, base_entity_type, default_sprite, icon, description, actions, is_enabled)
VALUES (
  'media-processor',
  'Media Processor',
  'object',
  'scripted-object',
  'male',
  '⚙️',
  'Converts raw media files into readable text',
  '{
    "process": {
      "description": "Process the file",
      "inputs": ["entry_id"],
      "outputs": []
    }
  }'::jsonb,
  true
)
ON CONFLICT (id) DO UPDATE SET
  actions = EXCLUDED.actions,
  description = EXCLUDED.description,
  is_enabled = true;

---------------------------------------------------------------------------
-- 4. Register action keys in n8n_webhook_registry
--    Points to Supabase Edge Function invoke URLs (same project)
---------------------------------------------------------------------------
INSERT INTO public.n8n_webhook_registry (action_key, webhook_url, description, is_active, timeout_ms)
VALUES
  ('task-board.assign_task',   'https://ktxdbeamrxhjtdattwts.supabase.co/functions/v1/task-board-assign',          'Assign an unprocessed media file to the player',       true, 30000),
  ('task-board.turn_in_task',  'https://ktxdbeamrxhjtdattwts.supabase.co/functions/v1/task-board-turnin',          'Verify processing complete and reward gold',            true, 30000),
  ('media-processor.process',  'https://ktxdbeamrxhjtdattwts.supabase.co/functions/v1/media-processor-process',    'Convert media file to markdown via extract-lore-text',  true, 120000)
ON CONFLICT (action_key) DO NOTHING;

---------------------------------------------------------------------------
-- 5. Place instances on simplemap (adjust coordinates to your map layout)
---------------------------------------------------------------------------
INSERT INTO public.object_instances (template_id, map_id, position, is_enabled)
VALUES
  ('task-board',      'simplemap', '{"x": 320, "y": 320}'::jsonb, true),
  ('media-processor', 'simplemap', '{"x": 480, "y": 320}'::jsonb, true);
