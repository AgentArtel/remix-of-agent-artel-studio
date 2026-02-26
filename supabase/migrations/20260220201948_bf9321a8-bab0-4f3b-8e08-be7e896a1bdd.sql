UPDATE public.picoclaw_agents 
SET fallback_models = '[{"backend": "gemini", "model": "gemini-2.5-flash"}]'::jsonb,
    llm_model = 'llama-3.3-70b-versatile'
WHERE picoclaw_agent_id = 'chad-the-shredder-maximus';

UPDATE public.picoclaw_agents 
SET fallback_models = '[{"backend": "gemini", "model": "gemini-2.5-flash"}]'::jsonb
WHERE picoclaw_agent_id = 'test-bot';