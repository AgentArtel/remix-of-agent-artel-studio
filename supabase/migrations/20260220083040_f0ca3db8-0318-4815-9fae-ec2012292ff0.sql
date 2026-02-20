
-- picoclaw_agents
CREATE TABLE public.picoclaw_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id text,
  picoclaw_agent_id text NOT NULL,
  soul_md text NOT NULL DEFAULT '',
  identity_md text NOT NULL DEFAULT '',
  user_md text NOT NULL DEFAULT '',
  agents_md text NOT NULL DEFAULT '',
  llm_backend text NOT NULL DEFAULT 'openai',
  llm_model text NOT NULL DEFAULT 'gpt-4',
  fallback_models jsonb NOT NULL DEFAULT '[]',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 4096,
  max_tool_iterations integer NOT NULL DEFAULT 10,
  memory_enabled boolean NOT NULL DEFAULT true,
  long_term_memory_enabled boolean NOT NULL DEFAULT false,
  channel text,
  guild_id text,
  parent_agent_id text,
  allowed_subagents jsonb NOT NULL DEFAULT '[]',
  heartbeat_interval_seconds integer,
  cron_schedules jsonb NOT NULL DEFAULT '[]',
  deployment_status text NOT NULL DEFAULT 'draft',
  last_deployed_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.picoclaw_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on picoclaw_agents" ON public.picoclaw_agents
  FOR ALL USING (true) WITH CHECK (true);

-- picoclaw_skills
CREATE TABLE public.picoclaw_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  skill_md text NOT NULL DEFAULT '',
  tools jsonb NOT NULL DEFAULT '[]',
  category text NOT NULL DEFAULT 'general',
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.picoclaw_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on picoclaw_skills" ON public.picoclaw_skills
  FOR ALL USING (true) WITH CHECK (true);

-- picoclaw_agent_skills
CREATE TABLE public.picoclaw_agent_skills (
  agent_id uuid NOT NULL REFERENCES public.picoclaw_agents(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.picoclaw_skills(id) ON DELETE CASCADE,
  config_overrides jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (agent_id, skill_id)
);

ALTER TABLE public.picoclaw_agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on picoclaw_agent_skills" ON public.picoclaw_agent_skills
  FOR ALL USING (true) WITH CHECK (true);
