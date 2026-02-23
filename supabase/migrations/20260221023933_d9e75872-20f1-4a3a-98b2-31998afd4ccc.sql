
-- Create game_registry table for syncing game data to studio dropdowns
CREATE TABLE public.game_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registry_type text NOT NULL,
  key text NOT NULL,
  label text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registry_type, key)
);

-- Enable RLS with permissive dev policy
ALTER TABLE public.game_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on game_registry"
  ON public.game_registry
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed known values
INSERT INTO public.game_registry (registry_type, key, label, metadata) VALUES
  -- Maps
  ('map', 'simplemap', 'Simple Map', '{"width": 640, "height": 640}'::jsonb),
  ('map', 'main', 'Main Map', '{}'::jsonb),
  -- Sprites
  ('sprite', 'female', 'Female', '{"spritesheet": "female"}'::jsonb),
  ('sprite', 'hero', 'Hero', '{"spritesheet": "hero"}'::jsonb),
  ('sprite', 'male', 'Male', '{"spritesheet": "male"}'::jsonb),
  -- Categories
  ('category', 'npc', 'NPC', '{}'::jsonb),
  ('category', 'merchant', 'Merchant', '{}'::jsonb),
  ('category', 'quest', 'Quest Giver', '{}'::jsonb),
  ('category', 'guard', 'Guard', '{}'::jsonb),
  -- Skills
  ('skill', 'move', 'Move', '{"description": "Move to a position"}'::jsonb),
  ('skill', 'say', 'Say', '{"description": "Speak dialogue"}'::jsonb),
  ('skill', 'look', 'Look', '{"description": "Look at something"}'::jsonb),
  ('skill', 'emote', 'Emote', '{"description": "Play an emote animation"}'::jsonb),
  ('skill', 'wait', 'Wait', '{"description": "Wait for a duration"}'::jsonb);
