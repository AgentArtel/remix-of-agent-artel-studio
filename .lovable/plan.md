

# Fix PicoClaw Bridge Gemini Model Routing

## The Problem (confirmed in code)

Two issues in `supabase/functions/picoclaw-bridge/index.ts`:

1. **Missing `google` backend**: Some agents have `llm_backend = 'google'` (not `'gemini'`). The `API_BASE_MAP` and `API_KEY_ENV_MAP` have no `google` entry, so these agents fall through to the PicoClaw gateway path and fail.

2. **Bad default fallback model**: Line 285 defaults to `'gemini-2.5-flash'` when no agent record matches. That model name doesn't exist on Google's OpenAI-compatible endpoint — the alias map would fix it, but only if the backend is `'gemini'`. If the agent lookup returns null, the backend defaults to `'groq'` (line 275), so the alias never fires and Groq gets a Gemini model name it doesn't recognize.

## Changes

### 1. Edge Function — `supabase/functions/picoclaw-bridge/index.ts`

**Add `google` as an alias in both maps** so agents with `llm_backend = 'google'` route correctly:

```typescript
const API_BASE_MAP = {
  // ... existing ...
  google: 'https://generativelanguage.googleapis.com/v1beta/openai',
}

const API_KEY_ENV_MAP = {
  // ... existing ...
  google: 'GEMINI_API_KEY',
}
```

**Extend `resolveModelName`** to also apply Gemini aliases when backend is `'google'`:

```typescript
if ((backend === 'gemini' || backend === 'google') && GEMINI_MODEL_ALIASES[rawModel]) {
```

**Change default fallback model** from `'gemini-2.5-flash'` to `'llama-3.1-8b-instant'` (Groq, which matches the default backend of `'groq'`):

```typescript
const rawModel = agent?.llm_model || 'llama-3.1-8b-instant'
```

### 2. DB data fix (recommended separately)

Run this SQL in the Supabase SQL Editor to fix any agents currently stuck on the `google` backend:

```sql
UPDATE picoclaw_agents
SET llm_backend = 'gemini',
    updated_at = now()
WHERE llm_backend = 'google';
```

This normalizes them to `gemini` so the existing alias map handles them. The Edge Function fix above is a safety net for any future agents that get created with `'google'`.

## No other files affected

The fix is entirely in the Edge Function. No frontend changes needed — the UI already reads `llm_backend` from the DB and passes it through.

