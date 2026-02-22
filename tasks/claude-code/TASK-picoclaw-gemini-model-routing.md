# TASK: Fix PicoClaw Gemini Model Routing on Railway

## Priority: HIGH
## Status: TODO

## Problem

PicoClaw on Railway (`picoclaw-production-40dc.up.railway.app:18790`) cannot route to **any** Gemini models. All chat requests fail with:

```
LLM call failed after retries: API request failed:
  Status: 404
  Body: {"error":{"message":"The model `gemini-2.5-flash` does not exist or you do not have access to it.","type":"invalid_request_error","code":"model_not_found"}}
```

The error format (`invalid_request_error`, `model_not_found`) is OpenAI-style, meaning LiteLLM is sending requests to an OpenAI-compatible endpoint instead of Google's native Gemini API.

## Affected Agents

All agents using `llm_backend: gemini`:
- `the-architect` (studio) — `gemini-2.5-flash`
- `the-lorekeeper` (studio) — `gemini-2.5-flash`
- `the-fragment-archivist` (game) — `gemini-2.5-pro`
- `marmalade-the-cat` (game) — `gemini-2.5-flash-lite`

## Root Cause Analysis

In `supabase/functions/picoclaw-bridge/index.ts`, the config builder sets:
```typescript
const API_BASE_MAP: Record<string, string> = {
  gemini: '',  // empty = LiteLLM native routing
  // ...
}
```

The model is registered as `gemini/gemini-2.5-flash` with empty `api_base`. LiteLLM should handle this natively, but PicoClaw's LiteLLM version or config may not support native Gemini routing.

## Investigation Steps

1. **Check Railway env vars** — Ensure `GEMINI_API_KEY` is set and valid
2. **Check LiteLLM version** in PicoClaw's Go runtime — does it support `gemini/` prefix natively?
3. **Check PicoClaw's LLM routing code** — how does it map `model: "gemini/gemini-2.5-flash"` + empty `api_base` to an actual API call?
4. **Test with explicit api_base** — Try setting `api_base: "https://generativelanguage.googleapis.com/v1beta"` for Gemini models
5. **Test model name variants** — LiteLLM may expect `gemini-2.5-flash` without the `gemini/` prefix, or `models/gemini-2.5-flash`

## Possible Fixes

### Option A: Set explicit Gemini API base in bridge
```typescript
const API_BASE_MAP: Record<string, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  // ...
}
```

### Option B: Update PicoClaw's LiteLLM config on Railway
Ensure the LiteLLM proxy or native integration is configured for Google Gemini with the correct API base and key.

### Option C: Update PicoClaw Go code
If PicoClaw's Go LLM client doesn't have native Gemini support, add it or use OpenAI-compatible Gemini endpoint:
```
api_base: https://generativelanguage.googleapis.com/v1beta/openai/
```
(Google's OpenAI-compatible endpoint)

## Verification

After fix, test chat with each agent:
```bash
curl -X POST http://picoclaw-production-40dc.up.railway.app:18790/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "agent_id": "the-architect", "session_key": "test"}'
```

All 4 Gemini-backed agents should respond successfully.

## Context Files
- `supabase/functions/picoclaw-bridge/index.ts` — Config builder with API_BASE_MAP
- PicoClaw Go source (Railway repo) — LLM routing logic
