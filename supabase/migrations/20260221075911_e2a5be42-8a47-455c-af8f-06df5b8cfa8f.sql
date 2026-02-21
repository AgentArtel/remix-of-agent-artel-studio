
-- Seed config_overrides for the Lorekeeper's fragment-analysis skill
UPDATE picoclaw_agent_skills 
SET config_overrides = jsonb_build_object(
  'accepted_fragment_types', jsonb_build_array('document', 'text', 'note'),
  'chunks_per_turn', 3,
  'narration_style', 'scholarly',
  'hint_text', 'Perhaps the Fragment Archivist could help with that kind of artifact.'
)
WHERE agent_id = '80de122a-88ad-4d75-9551-d1f51c3d5ddd' 
  AND skill_id = 'aa7bc84a-6421-440c-817d-6763814ae65d';

-- Seed config_overrides for the Fragment Archivist's fragment-analysis skill
UPDATE picoclaw_agent_skills 
SET config_overrides = jsonb_build_object(
  'accepted_fragment_types', jsonb_build_array('image', 'audio', 'video', 'artifact'),
  'chunks_per_turn', 2,
  'narration_style', 'analytical',
  'hint_text', 'The Lorekeeper in the Archives would know more about written texts.'
)
WHERE agent_id = 'cea70c57-bc0a-409d-ad69-4cad61c97e7f' 
  AND skill_id = 'aa7bc84a-6421-440c-817d-6763814ae65d';
