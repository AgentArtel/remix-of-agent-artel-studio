-- Disable old object_templates rows not in the event registry
UPDATE game.object_templates SET is_enabled = false WHERE id NOT IN ('test-npc', 'guard', 'artist', 'photographer', 'vendor', 'missionary', 'cat-dad', 'standalone-npc', 'hybrid-npc', 'ai-object', 'container', 'trigger-zone', 'static-decoration', 'point-marker', 'npc-api', 'object-api', 'custom-npc');

-- Upsert the 17 valid event-id rows (using valid base_entity_type values from check constraint)
INSERT INTO game.object_templates (id, name, category, base_entity_type, default_sprite, icon, description, is_enabled)
VALUES
  ('test-npc', 'Test NPC', 'npc', 'scripted-npc', 'female', '🧪', 'Test NPC for debugging', true),
  ('guard', 'Guard', 'npc', 'scripted-npc', 'hero', '⚔️', 'Patrolling guard NPC', true),
  ('artist', 'Artist', 'npc', 'scripted-npc', 'female', '🎨', 'Artist NPC', true),
  ('photographer', 'Photographer', 'npc', 'scripted-npc', 'female', '📷', 'Photographer NPC', true),
  ('vendor', 'Vendor', 'npc', 'scripted-npc', 'female', '🛒', 'Vendor NPC', true),
  ('missionary', 'Missionary', 'npc', 'scripted-npc', 'female', '⛪', 'Missionary NPC', true),
  ('cat-dad', 'Cat Dad', 'npc', 'scripted-npc', 'female', '🐱', 'Cat Dad NPC', true),
  ('standalone-npc', 'Standalone NPC', 'npc', 'ai-npc', 'female', '🤖', 'Generic AI NPC', true),
  ('custom-npc', 'Custom NPC', 'npc', 'ai-npc', 'female', '🎭', 'Custom configurable NPC', true),
  ('hybrid-npc', 'Hybrid NPC', 'npc', 'hybrid-npc', 'female', '🤖', 'Hybrid AI NPC', true),
  ('ai-object', 'AI Object', 'object', 'ai-object', 'female', '📦', 'AI-powered interactive object', true),
  ('container', 'Container', 'container', 'container', 'female', '🎁', 'Lootable container', true),
  ('trigger-zone', 'Trigger Zone', 'trigger', 'area-trigger', 'female', '⚡', 'Invisible event trigger zone', true),
  ('static-decoration', 'Static Decoration', 'decoration', 'static-object', 'female', '🌿', 'Visual decoration', true),
  ('point-marker', 'Point Marker', 'point', 'spawn-point', 'female', '📍', 'Map marker (spawn/patrol/quest)', true),
  ('npc-api', 'NPC (API)', 'npc', 'simple-npc', 'female', '🔌', 'API-backed NPC (behavior driven by external service)', true),
  ('object-api', 'Object (API)', 'object', 'scripted-object', '!Other1', '🔌', 'API-backed object (e.g. mailbox, bulletin board)', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  base_entity_type = EXCLUDED.base_entity_type,
  is_enabled = true;
