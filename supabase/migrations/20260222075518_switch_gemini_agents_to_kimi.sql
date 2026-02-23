-- Switch Gemini-backend agents to Kimi/Moonshot (kimi-k2.5)
-- Reason: Google's OpenAI-compatible endpoint doesn't work with AI Studio API keys.
-- Moonshot/Kimi is already configured and works through PicoClaw's OpenAI-compatible calls.

UPDATE picoclaw_agents
SET llm_backend = 'kimi',
    llm_model = 'kimi-k2.5',
    updated_at = now()
WHERE llm_backend = 'gemini';
