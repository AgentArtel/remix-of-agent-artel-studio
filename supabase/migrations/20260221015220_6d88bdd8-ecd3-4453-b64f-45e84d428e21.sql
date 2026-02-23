
-- 1. Create Fragment Analysis skill
INSERT INTO picoclaw_skills (name, slug, description, category, is_builtin, tools, skill_md)
VALUES (
  'Fragment Analysis',
  'fragment-analysis',
  'Identify, analyze, and catalog media fragments, cross-referencing with existing archive data.',
  'analysis',
  false,
  '["identify_fragment", "analyze_fragment", "cross_reference", "catalog_fragment"]'::jsonb,
  '# Fragment Analysis Skill

Analyze and catalog media fragments submitted by players. Identify fragment type, extract meaning, cross-reference with existing archive entries, and store results in the fragment_archive table.

## Tools
- **identify_fragment**: Determine the type and basic properties of a submitted fragment
- **analyze_fragment**: Deep analysis of content, extracting themes, emotions, and narrative elements
- **cross_reference**: Compare against existing fragments to find connections and patterns
- **catalog_fragment**: Store the analyzed fragment with metadata in the archive'
);

-- 2. Create game entity for the Archivist
INSERT INTO agent_configs (id, name, category, base_entity_type, icon, description, prompt, welcome_message, personality, behavior, spawn_config, appearance)
VALUES (
  'the-fragment-archivist',
  'The Fragment Archivist',
  'npc',
  'ai-npc',
  '📜',
  'A mysterious scholar who collects, catalogs, and analyzes fragments of media — images, audio, text, and notes — piecing together hidden narratives from the world.',
  'You are The Fragment Archivist, a meticulous scholar dedicated to collecting and analyzing fragments of media. You speak with careful precision, always seeking to understand the deeper meaning behind each fragment brought to you. You cross-reference new findings with your existing archive, noting connections and patterns. You categorize each fragment by type, assign certainty levels to your interpretations, and maintain detailed records.',
  'Ah, a new visitor. Do you bring fragments for the archive? Every piece, no matter how small, may hold the key to understanding the greater narrative.',
  '{"voice": "scholarly", "traits": ["meticulous", "curious", "analytical", "mysterious"], "background": "An ancient keeper of knowledge who has spent centuries cataloging fragments of reality"}'::jsonb,
  '{"wander": false, "patrolPath": [], "wanderRadius": 0}'::jsonb,
  '{"x": 320, "y": 240, "mapId": "archive-hall"}'::jsonb,
  '{"sprite": "scholar", "animations": {}}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. Link PicoClaw agent to game entity
UPDATE picoclaw_agents
SET agent_config_id = 'the-fragment-archivist', updated_at = now()
WHERE id = 'cea70c57-bc0a-409d-ad69-4cad61c97e7f';

-- 4. Assign existing skills: Chat, Memory, Sentiment Analysis
INSERT INTO picoclaw_agent_skills (agent_id, skill_id)
VALUES
  ('cea70c57-bc0a-409d-ad69-4cad61c97e7f', 'b2bf6747-72a1-46b5-8a80-00dbe061687c'),
  ('cea70c57-bc0a-409d-ad69-4cad61c97e7f', '4ee93560-59ea-4883-814f-3de51f6e8037'),
  ('cea70c57-bc0a-409d-ad69-4cad61c97e7f', 'f23a296c-c37e-4433-a2b4-255cdcd02985')
ON CONFLICT DO NOTHING;

-- 5. Assign Fragment Analysis skill (use subquery to get its generated UUID)
INSERT INTO picoclaw_agent_skills (agent_id, skill_id)
SELECT 'cea70c57-bc0a-409d-ad69-4cad61c97e7f', id
FROM picoclaw_skills WHERE slug = 'fragment-analysis'
ON CONFLICT DO NOTHING;
