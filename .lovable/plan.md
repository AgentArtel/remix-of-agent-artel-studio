# Fix: Lorekeeper Memory and Character Issues

## Problem Analysis

Three issues are causing the Lorekeeper to appear "broken":

1. **Temperature rejection** -- Gemini's OpenAI-compatible endpoint for certain models only accepts `temperature: 1`. The bridge passes the agent's configured temperature directly, causing 500 errors for values like 0.7.
2. **Session ID mismatch** -- The Agent Builder test panel generates session IDs like `studio-test-{uuid}`, while the World Lore workshop uses `the-lorekeeper_studio-user`. These are separate memory pools, so the test panel always starts fresh with no conversation history.
3. **Character breaking at high temperature** -- After changing temperature to 1 to fix the rejection, the model responds with less instruction-following ("As a large language model, I have no memory"), violating the agent's own rules.

## Planned Fixes

### 1. Temperature clamping in picoclaw-bridge (edge function)

Add a temperature normalization step before calling the Gemini API. If the backend is `gemini`, clamp temperature to a safe range or omit it when the model rejects custom values. This prevents 500 errors.

### 2. Session continuity option for test panel

Update `AgentChatTest.tsx` to use the agent's canonical session ID (e.g., `{picoclaw_agent_id}_studio-user`) instead of `studio-test-{uuid}`, so the test panel shares memory with the workshop chat. Alternatively, add a toggle to choose between "fresh session" and "continue existing session."

### 3. Strengthen system prompt injection

Add an explicit instruction in the system message construction (lines 291-294 of picoclaw-bridge) to remind the model: "You have persistent memory. The conversation history below represents your memory of past interactions. Only claim you have no memory when it is a fact that you have no memory" 

## Technical Details

### File: `supabase/functions/picoclaw-bridge/index.ts`

- In `handleChat()`, after resolving the model name, add temperature clamping logic for Gemini models
- In the system message builder (lines 291-294), append a memory-awareness instruction when memory rows exist
- Redeploy the edge function

### File: `src/components/agents/AgentChatTest.tsx`

- Change session ID from `studio-test-${agentId}` to use the agent's `picoclaw_agent_id` for continuity, or add a "Use existing session" toggle

### No database changes required.