
-- Studio Workflows
CREATE TABLE public.studio_workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  name text NOT NULL,
  description text,
  status text DEFAULT 'inactive',
  node_count integer DEFAULT 0,
  execution_count integer DEFAULT 0,
  last_run_at timestamptz,
  nodes_data jsonb DEFAULT '[]'::jsonb,
  connections_data jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.studio_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.studio_workflows FOR ALL USING (true) WITH CHECK (true);

-- Studio Executions
CREATE TABLE public.studio_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id uuid REFERENCES public.studio_workflows(id) ON DELETE CASCADE,
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  status text DEFAULT 'pending',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  node_results jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.studio_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.studio_executions FOR ALL USING (true) WITH CHECK (true);

-- Studio Activity Log
CREATE TABLE public.studio_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  type text NOT NULL,
  message text NOT NULL,
  workflow_name text,
  workflow_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.studio_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.studio_activity_log FOR ALL USING (true) WITH CHECK (true);
