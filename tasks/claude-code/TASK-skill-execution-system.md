# TASK: Dynamic Skill & Tool Execution System

## Context

The Studio project has a skill/tool metadata system in the database (`picoclaw_skills`, `picoclaw_agent_skills`) but **none of the skills are actually executable**. They're just labels. This task is to make them real.

## Current State

### Database Schema (already exists)

- **`picoclaw_skills`** — Skill definitions with `slug`, `name`, `description`, `tools` (JSON array of tool names), `skill_md`, `category`, `is_builtin`
- **`picoclaw_agent_skills`** — Join table linking agents to skills with `config_overrides`
- **`picoclaw_agents`** — Agent definitions with LLM config, personality markdown files, etc.

### Existing Skills in DB

| Slug | Tools | Status |
|------|-------|--------|
| `chat` | `["respond", "ask"]` | ❌ Implicit only — LLM handles natively |
| `memory` | `["recall", "store"]` | ❌ Implicit — `agent_memory` table exists but not exposed as callable tools |
| `sentiment` | `["analyze_sentiment"]` | ❌ No implementation |
| `image-gen` | `["generate_image"]` | ❌ Hardcoded in `npc-ai-chat` only for OpenAI |
| `code-exec` | `["run_code", "lint"]` | ❌ No implementation |
| `web-search` | `["search", "summarize"]` | ❌ No implementation |
| `fragment-analysis` | `["identify_fragment", "analyze_fragment", "cross_reference", "catalog_fragment"]` | ❌ No implementation |

### Current Edge Function: `supabase/functions/npc-ai-chat/index.ts`

This is the main chat function. It currently:
1. Checks for a PicoClaw gateway deployment → forwards if running
2. Falls back to direct LLM calls (OpenAI, Gemini, Kimi, Groq)
3. Only 3 hardcoded tool definitions: `move`, `say`, `generate_image`
4. Does NOT query `picoclaw_agent_skills` to know what tools an agent has
5. Does NOT implement tool execution — if the LLM returns a tool call, it's returned raw to the client

### Available AI Gateway

The project has the **Lovable AI Gateway** available at `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY` secret pre-configured. It's OpenAI-compatible and supports tool calling. Available models include `google/gemini-2.5-pro`, `google/gemini-2.5-flash`, `openai/gpt-5`, etc.

The project also has direct API keys for: `GEMINI_API_KEY`, `KIMI_API_KEY`, `GROQ_API_KEY`.

### Supabase Project

- **Project ID**: `ktxdbeamrxhjtdattwts`
- **URL**: `https://ktxdbeamrxhjtdattwts.supabase.co`

---

## What Needs to Be Built

### 1. Tool Registry & Schema Definitions

Create a mapping from tool slugs → OpenAI function-calling schemas. This should be:
- Stored somewhere extensible (could be in the `picoclaw_skills.tools` JSON, or a new `tool_definitions` table, or a code registry)
- Each tool needs: `name`, `description`, `parameters` (JSON Schema)

Example for `analyze_sentiment`:
```json
{
  "type": "function",
  "function": {
    "name": "analyze_sentiment",
    "description": "Analyze the emotional tone of the given text",
    "parameters": {
      "type": "object",
      "properties": {
        "text": { "type": "string", "description": "Text to analyze" }
      },
      "required": ["text"]
    }
  }
}
```

### 2. Tool Execution Handlers

When the LLM returns a tool call, something needs to actually execute it. Options:
- **In-function handlers** in `npc-ai-chat` (simplest)
- **Separate edge function** per tool (most modular)
- **Handler registry pattern** in a shared module

Each tool handler needs to:
1. Receive the tool call arguments
2. Execute the logic (DB query, API call, computation)
3. Return results back to the LLM for a follow-up response

### 3. Dynamic Skill Loading in `npc-ai-chat`

Update the edge function to:
1. Query `picoclaw_agent_skills` + `picoclaw_skills` for the agent being called
2. Build the `tools` array dynamically from the agent's assigned skills
3. Send tools to the LLM
4. Handle tool call responses with an execution loop (call tool → return result → let LLM respond)

### 4. Tool Implementation Priorities

**Phase 1 — Core (implement first):**
- `recall` / `store` — Read/write to `agent_memory` with semantic search if possible
- `analyze_sentiment` — Can use the Lovable AI Gateway itself to do a quick classification

**Phase 2 — Creative:**
- `generate_image` — Already partially implemented, needs to work via `generate-image` edge function
- `search` / `summarize` — Web search via an external API or the AI gateway

**Phase 3 — Advanced:**
- `run_code` / `lint` — Sandboxed code execution (complex, may need external service)
- Fragment analysis tools — Read/write to `fragment_archive` table

### 5. Adding New Skills

The system should make it easy to add new skills:
1. Insert a row in `picoclaw_skills` with the tool definitions
2. Implement a handler function
3. Register the handler in the tool registry
4. Assign to agents via `picoclaw_agent_skills`

No code changes should be needed in the main chat function to add a new skill.

---

## Key Files

| File | Purpose |
|------|---------|
| `supabase/functions/npc-ai-chat/index.ts` | Main chat edge function — needs dynamic tool loading + execution loop |
| `supabase/functions/generate-image/index.ts` | Existing image gen function |
| `supabase/functions/gemini-chat/index.ts` | Existing Gemini chat function |
| `supabase/functions/picoclaw-bridge/index.ts` | PicoClaw gateway bridge |
| `src/lib/memoryService.ts` | Client-side memory service (for reference) |
| `src/hooks/usePicoClawAgents.ts` | Frontend hooks for agent CRUD |

## Database Tables

| Table | Relevance |
|-------|-----------|
| `picoclaw_skills` | Skill definitions — may need a `tool_schemas` JSONB column for OpenAI tool definitions |
| `picoclaw_agent_skills` | Agent ↔ Skill assignments |
| `picoclaw_agents` | Agent config (LLM model, temperature, etc.) |
| `agent_memory` | Memory storage for recall/store tools |
| `fragment_archive` | Fragment storage for analysis tools |

## Architecture Decision

The `npc-ai-chat` function is already 394 lines. Consider splitting into:
```
supabase/functions/npc-ai-chat/
  index.ts          — Main handler, routing, memory save
  tools/
    registry.ts     — Tool schema registry (reads from DB or code)
    executor.ts     — Tool execution dispatcher
    handlers/
      memory.ts     — recall, store
      sentiment.ts  — analyze_sentiment
      image.ts      — generate_image
      search.ts     — search, summarize
```

**Note:** Supabase edge functions must have all code in `index.ts` or use Deno-compatible imports. Shared code can go in `supabase/functions/_shared/` (underscore prefix = not deployed as a function).

## Success Criteria

1. An agent with `sentiment` skill assigned can analyze text sentiment when asked
2. An agent with `memory` skill can explicitly recall past conversations
3. New skills can be added via DB insert + handler code without modifying the main chat function
4. Tool execution follows the standard LLM tool-calling loop (call → execute → return → respond)
5. The Lorekeeper specifically works with its assigned skills (chat, memory, sentiment)

## Testing

- Use `supabase.functions.invoke('npc-ai-chat', { body: { ... } })` to test
- Verify tool calls appear in the response when skills are assigned
- Check `agent_memory` table for memory tool writes
- Check edge function logs at: https://supabase.com/dashboard/project/ktxdbeamrxhjtdattwts/functions/npc-ai-chat/logs
