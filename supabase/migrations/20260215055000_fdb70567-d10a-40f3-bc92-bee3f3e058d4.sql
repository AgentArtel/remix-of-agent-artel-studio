INSERT INTO api_integrations (id, name, skill_name, category, description, required_item_id, requires_env, enabled) VALUES
  ('kimi-chat', 'Kimi Chat', 'kimi_chat', 'api', 'Chat completion via Moonshot Kimi K2/K2.5 models with tool calling, JSON mode, and context caching', 'none', ARRAY['MOONSHOT_API_KEY'], true),
  ('kimi-vision', 'Kimi Vision', 'kimi_vision', 'api', 'Multimodal understanding — send images and video alongside text for analysis via Kimi K2.5', 'none', ARRAY['MOONSHOT_API_KEY'], true),
  ('kimi-web-search', 'Kimi Web Search', 'kimi_web_search', 'knowledge', 'Real-time web search via Kimi built-in $web_search tool for grounded responses', 'none', ARRAY['MOONSHOT_API_KEY'], true),
  ('kimi-thinking', 'Kimi Thinking', 'kimi_thinking', 'api', 'Chain-of-thought reasoning mode for complex NPC decision-making via Kimi thinking models', 'none', ARRAY['MOONSHOT_API_KEY'], true)
ON CONFLICT (id) DO NOTHING;