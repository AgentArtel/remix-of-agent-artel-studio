
-- Seed picoclaw_skills
INSERT INTO public.picoclaw_skills (name, slug, description, category, is_builtin, skill_md, tools) VALUES
  ('Chat', 'chat', 'Basic conversational ability', 'core', true, '# Chat Skill', '["respond","ask"]'),
  ('Memory', 'memory', 'Remember past conversations', 'core', true, '# Memory Skill', '["recall","store"]'),
  ('Web Search', 'web-search', 'Search the internet for information', 'research', true, '# Web Search', '["search","summarize"]'),
  ('Image Generation', 'image-gen', 'Generate images from text prompts', 'creative', true, '# Image Gen', '["generate_image"]'),
  ('Code Execution', 'code-exec', 'Run code snippets safely', 'developer', true, '# Code Exec', '["run_code","lint"]'),
  ('Sentiment Analysis', 'sentiment', 'Analyze emotional tone of text', 'analysis', false, '# Sentiment', '["analyze_sentiment"]');

-- Seed picoclaw_agents
INSERT INTO public.picoclaw_agents (picoclaw_agent_id, soul_md, identity_md, llm_backend, llm_model, temperature, deployment_status, memory_enabled, long_term_memory_enabled) VALUES
  ('oracle-sage', '# Soul\nI seek truth above all else.', '# Identity\nYou are Oracle Sage, an ancient philosopher NPC.', 'openai', 'gpt-4', 0.8, 'running', true, true),
  ('merchant-marco', '# Soul\nProfit is an art form.', '# Identity\nYou are Merchant Marco, a shrewd trader.', 'groq', 'llama-3.1-8b-instant', 0.6, 'running', true, false),
  ('guard-captain', '# Soul\nDuty before all.', '# Identity\nYou are the Guard Captain, protector of the realm.', 'openai', 'gpt-4', 0.4, 'stopped', true, false),
  ('bard-lyra', '# Soul\nMusic is the language of the cosmos.', '# Identity\nYou are Bard Lyra, a wandering musician.', 'openai', 'gpt-4o', 0.9, 'draft', true, true),
  ('alchemist-zara', '# Soul\nEvery element has a secret.', '# Identity\nYou are Alchemist Zara, master of potions.', 'groq', 'llama-3.1-8b-instant', 0.7, 'error', true, false);

-- Assign skills to agents
INSERT INTO public.picoclaw_agent_skills (agent_id, skill_id)
SELECT a.id, s.id FROM picoclaw_agents a, picoclaw_skills s
WHERE (a.picoclaw_agent_id = 'oracle-sage' AND s.slug IN ('chat','memory','web-search'))
   OR (a.picoclaw_agent_id = 'merchant-marco' AND s.slug IN ('chat','sentiment'))
   OR (a.picoclaw_agent_id = 'guard-captain' AND s.slug IN ('chat'))
   OR (a.picoclaw_agent_id = 'bard-lyra' AND s.slug IN ('chat','memory','image-gen'))
   OR (a.picoclaw_agent_id = 'alchemist-zara' AND s.slug IN ('chat','code-exec','web-search'));
