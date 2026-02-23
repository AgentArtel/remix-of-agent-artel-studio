-- Enable long-term memory on the Lorekeeper
UPDATE picoclaw_agents
SET long_term_memory_enabled = true,
    updated_at = now()
WHERE picoclaw_agent_id = 'the-lorekeeper' AND agent_type = 'studio';

-- Assign core skills (Chat + Memory) to the Lorekeeper
INSERT INTO picoclaw_agent_skills (agent_id, skill_id)
SELECT '14058b12-6a57-4993-8664-500c8da140fe', id
FROM picoclaw_skills
WHERE slug IN ('chat', 'memory', 'sentiment')
ON CONFLICT DO NOTHING;