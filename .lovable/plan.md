

# Fix Plan: Gemini API Routing, Model Updates, and Chat Agent Selection

## Problems Identified

1. **Gemini API routing is broken**: The bridge still sets `api_base` for Gemini to `https://generativelanguage.googleapis.com/v1beta`. PicoClaw uses LiteLLM internally which handles `gemini/` model prefixes natively. Setting `api_base` causes LiteLLM to treat it as an OpenAI-compatible endpoint, resulting in 404 errors.

2. **Moonshot API URL is wrong**: The bridge uses `api.moonshot.cn` but the correct domain is `api.moonshot.ai`.

3. **Model list needs updating**: The dropdown in the Agent Form needs the correct Gemini model IDs per the latest docs (e.g., `gemini-3.1-pro-preview` not `gemini-3.1-pro`).

4. **Chat targeting the wrong agent**: This was caused by the old `test-bot` agent being deployed alongside Chad on PicoClaw. That agent no longer exists in the DB, so this is resolved. The `AgentChatTest` component correctly passes the selected agent's ID to the bridge.

## Changes

### 1. Fix `picoclaw-bridge/index.ts` - API Base Map

- Set `gemini` entry to `''` (empty string) so LiteLLM uses its native Gemini routing
- Update `moonshot` and `kimi` entries from `api.moonshot.cn` to `api.moonshot.ai`

### 2. Update `AgentFormModal.tsx` - Model List

Update to match the actual model IDs from the providers:

**Gemini:**
- `gemini-3.1-pro-preview` (new)
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

**Moonshot/Kimi:**
- `kimi-k2.5`
- `kimi-k2`
- `moonshot-v1-128k`
- `moonshot-v1-32k`
- `moonshot-v1-8k`

**Groq** (keep existing, they match the docs)

### 3. Update Chad's model in DB

Update Chad from `gemini-2.5-flash` to `gemini-2.5-flash` (this is actually correct per the latest docs -- `gemini-2.5-flash` is a valid stable model ID). No DB change needed unless you want to switch to `gemini-2.5-pro` or the new `gemini-3.1-pro-preview`.

### 4. Redeploy the edge function

The updated bridge will be auto-deployed, sending correct routing config to PicoClaw on the next deploy action.

## Technical Details

```text
File: supabase/functions/picoclaw-bridge/index.ts
  Line 42: gemini: '' (was 'https://generativelanguage.googleapis.com/v1beta')
  Line 43: moonshot: 'https://api.moonshot.ai/v1' (was api.moonshot.cn)
  Line 44: kimi: 'https://api.moonshot.ai/v1' (was api.moonshot.cn)

File: src/components/agents/AgentFormModal.tsx
  Lines 48-63: Update Gemini and Moonshot model entries to match latest API docs
```

