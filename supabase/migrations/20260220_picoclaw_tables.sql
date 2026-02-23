-- PicoClaw Agent Builder tables
-- Provides schema for managing PicoClaw agents, skills, and their assignments

-- Core agent config
-- agent_config_id is TEXT, no FK (agent_configs may live in different schema)
CREATE TABLE IF NOT EXISTS picoclaw_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_config_id TEXT,                       -- soft ref to public.agent_configs(id)
  picoclaw_agent_id TEXT UNIQUE NOT NULL,     -- slug: "elder-theron"

  -- Bootstrap markdown files (PicoClaw's personality system)
  soul_md TEXT DEFAULT '',                     -- SOUL.md: personality, values, style
  identity_md TEXT DEFAULT '',                 -- IDENTITY.md: role, background, knowledge
  user_md TEXT DEFAULT '',                     -- USER.md: context about who agent serves
  agents_md TEXT DEFAULT '',                   -- AGENTS.md: general behavior directives

  -- LLM config
  llm_backend TEXT DEFAULT 'groq',
  llm_model TEXT DEFAULT 'llama-3.1-8b-instant',
  fallback_models TEXT[] DEFAULT '{}',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  max_tool_iterations INTEGER DEFAULT 20,

  -- Memory
  memory_enabled BOOLEAN DEFAULT true,
  long_term_memory_enabled BOOLEAN DEFAULT true,

  -- Multi-agent
  channel TEXT,
  guild_id TEXT,
  parent_agent_id UUID REFERENCES picoclaw_agents(id),
  allowed_subagents TEXT[] DEFAULT '{}',

  -- Scheduling
  heartbeat_interval_seconds INTEGER,
  cron_schedules JSONB DEFAULT '[]',

  -- Deployment
  deployment_status TEXT DEFAULT 'draft',
  last_deployed_at TIMESTAMPTZ,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Reusable skill library
CREATE TABLE IF NOT EXISTS picoclaw_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  skill_md TEXT NOT NULL,
  tools JSONB DEFAULT '[]',
  category TEXT DEFAULT 'general',
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent <-> Skill junction
CREATE TABLE IF NOT EXISTS picoclaw_agent_skills (
  agent_id UUID REFERENCES picoclaw_agents(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES picoclaw_skills(id) ON DELETE CASCADE,
  config_overrides JSONB DEFAULT '{}',
  PRIMARY KEY (agent_id, skill_id)
);

-- RLS: public read/write (matches existing agent_configs pattern)
ALTER TABLE picoclaw_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE picoclaw_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE picoclaw_agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON picoclaw_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON picoclaw_skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON picoclaw_agent_skills FOR ALL USING (true) WITH CHECK (true);

-- Seed built-in game skills
INSERT INTO picoclaw_skills (name, slug, description, skill_md, tools, category, is_builtin) VALUES
  ('Show Text', 'game-show-text', 'Display dialog text to the player',
   'Show text messages to players during NPC conversations.',
   '[{"name":"game_show_text","description":"Display a message to the player","parameters":{"type":"object","properties":{"text":{"type":"string","description":"The message to show"}},"required":["text"]}}]'::jsonb,
   'game', true),
  ('Give Item', 'game-give-item', 'Add items to player inventory',
   'Give items to players as quest rewards or during interactions.',
   '[{"name":"game_give_item","description":"Add an item to player inventory","parameters":{"type":"object","properties":{"itemId":{"type":"string"},"count":{"type":"integer","default":1}},"required":["itemId"]}}]'::jsonb,
   'game', true),
  ('Teleport', 'game-teleport', 'Move the player to a map position',
   'Teleport the player to a specific map and coordinates.',
   '[{"name":"game_teleport","description":"Move player to a location","parameters":{"type":"object","properties":{"mapId":{"type":"string"},"x":{"type":"integer"},"y":{"type":"integer"}},"required":["mapId"]}}]'::jsonb,
   'game', true),
  ('Set Variable', 'game-set-variable', 'Set a game state variable',
   'Set persistent game variables to track quest progress and flags.',
   '[{"name":"game_set_variable","description":"Set a game variable","parameters":{"type":"object","properties":{"key":{"type":"string"},"value":{"type":"string"}},"required":["key","value"]}}]'::jsonb,
   'game', true),
  ('Web Search', 'web-search', 'Search the web for information',
   'Search the web to find current information.',
   '[{"name":"web_search","description":"Search the web","parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}}]'::jsonb,
   'utility', true),
  ('HTTP Request', 'http-request', 'Make HTTP API calls',
   'Make HTTP requests to external APIs.',
   '[{"name":"http_request","description":"Make an HTTP request","parameters":{"type":"object","properties":{"url":{"type":"string"},"method":{"type":"string","default":"GET"},"body":{"type":"string"}},"required":["url"]}}]'::jsonb,
   'utility', true);
