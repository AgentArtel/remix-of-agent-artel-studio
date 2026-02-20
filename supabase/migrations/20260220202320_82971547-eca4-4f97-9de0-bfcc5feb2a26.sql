UPDATE public.picoclaw_agents 
SET llm_backend = 'gemini', llm_model = 'gemini-2.5-flash',
    fallback_models = '[{"backend": "groq", "model": "llama-3.3-70b-versatile"}]'::jsonb
WHERE picoclaw_agent_id = 'chad-the-shredder-maximus';