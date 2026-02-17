-- Move all game schema tables to public schema for Supabase API compatibility
-- This allows the tables to be accessed via PostgREST without extra configuration

-- First, check if tables exist in game schema and move them to public
DO $$
BEGIN
  -- agent_configs
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'game' AND table_name = 'agent_configs') THEN
    -- Copy data to public if table doesn't exist there
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'agent_configs') THEN
      CREATE TABLE public.agent_configs AS SELECT * FROM game.agent_configs WHERE false;
      ALTER TABLE public.agent_configs ADD PRIMARY KEY (id);
      INSERT INTO public.agent_configs SELECT * FROM game.agent_configs;
    END IF;
  END IF;

  -- agent_memory
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'game' AND table_name = 'agent_memory') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'agent_memory') THEN
      CREATE TABLE public.agent_memory AS SELECT * FROM game.agent_memory WHERE false;
      ALTER TABLE public.agent_memory ADD PRIMARY KEY (id);
      INSERT INTO public.agent_memory SELECT * FROM game.agent_memory;
    END IF;
  END IF;

  -- player_state
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'game' AND table_name = 'player_state') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'player_state') THEN
      CREATE TABLE public.player_state AS SELECT * FROM game.player_state WHERE false;
      ALTER TABLE public.player_state ADD PRIMARY KEY (id);
      INSERT INTO public.player_state SELECT * FROM game.player_state;
    END IF;
  END IF;

  -- npc_instances
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'game' AND table_name = 'npc_instances') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'npc_instances') THEN
      CREATE TABLE public.npc_instances AS SELECT * FROM game.npc_instances WHERE false;
      ALTER TABLE public.npc_instances ADD PRIMARY KEY (id);
      INSERT INTO public.npc_instances SELECT * FROM game.npc_instances;
    END IF;
  END IF;

  -- sync_status
  IF EXISTS (SELECT 1 FROM information_schema.tables 
             WHERE table_schema = 'game' AND table_name = 'sync_status') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'sync_status') THEN
      CREATE TABLE public.sync_status AS SELECT * FROM game.sync_status WHERE false;
      ALTER TABLE public.sync_status ADD PRIMARY KEY (id);
      INSERT INTO public.sync_status SELECT * FROM game.sync_status;
    END IF;
  END IF;
END $$;

-- Enable RLS on public tables
ALTER TABLE IF EXISTS public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.player_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.npc_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sync_status ENABLE ROW LEVEL SECURITY;

-- Add policies for public tables
DROP POLICY IF EXISTS "Allow all" ON public.agent_configs;
CREATE POLICY "Allow all" ON public.agent_configs
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON public.agent_memory;
CREATE POLICY "Allow all" ON public.agent_memory
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON public.player_state;
CREATE POLICY "Allow all" ON public.player_state
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON public.npc_instances;
CREATE POLICY "Allow all" ON public.npc_instances
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON public.sync_status;
CREATE POLICY "Allow all" ON public.sync_status
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for public tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_configs;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_memory;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.player_state;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.npc_instances;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_status;
  END IF;
END $$;
