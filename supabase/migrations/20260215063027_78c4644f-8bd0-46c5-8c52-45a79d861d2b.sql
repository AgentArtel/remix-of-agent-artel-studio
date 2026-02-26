INSERT INTO game.api_integrations (id, name, skill_name, required_item_id, category, requires_env, enabled, description)
VALUES
  ('kimi-chat', 'Kimi Chat', 'kimi_chat', 'kimi-api-token', 'ai', ARRAY['MOONSHOT_API_KEY'], true, 'Conversational AI via Moonshot Kimi K2 models'),
  ('kimi-vision', 'Kimi Vision', 'kimi_vision', 'kimi-api-token', 'ai', ARRAY['MOONSHOT_API_KEY'], true, 'Image understanding and analysis via Kimi'),
  ('kimi-web-search', 'Kimi Web Search', 'kimi_web_search', 'kimi-api-token', 'ai', ARRAY['MOONSHOT_API_KEY'], true, 'Web search grounded responses via Kimi'),
  ('kimi-thinking', 'Kimi Thinking', 'kimi_thinking', 'kimi-api-token', 'ai', ARRAY['MOONSHOT_API_KEY'], true, 'Extended reasoning with visible thought process via Kimi')
ON CONFLICT (id) DO NOTHING;