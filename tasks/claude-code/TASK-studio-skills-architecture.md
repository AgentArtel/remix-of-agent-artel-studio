# Task Brief: Skill Execution System — Backend Implementation

## Context

Lovable has built the **Studio Dashboard** with two new tabs:

1. **Skills Tab** — Full CRUD UI for managing `picoclaw_skills` (create, edit, delete skills with name, slug, description, category, skill_md, tools array, is_builtin flag)
2. **Architecture Tab** — Visual documentation showing the skill execution flow and all 16 deployed edge functions

The frontend is complete. This task covers what **Claude Code** needs to implement on the backend to make skills actually functional at runtime.

---

## What Was Built (Lovable Side)

### Files Created/Modified
- `src/components/dashboard/SkillsManager.tsx` — CRUD interface for `picoclaw_skills`
- `src/components/dashboard/ArchitectureView.tsx` — Visual flow diagram + edge function registry
- `src/pages/Dashboard.tsx` — Tabbed layout (Overview, Skills, Architecture)
- `src/hooks/usePicoClawAgents.ts` — Added `useCreateSkill`, `useUpdateSkill`, `useDeleteSkill`, `useSkillAgentCounts` hooks

### Database Tables Used (already exist)
- `picoclaw_skills` — id, name, slug, description, skill_md, tools (jsonb array of tool name strings), category, is_builtin, created_at
- `picoclaw_agent_skills` — agent_id, skill_id, config_overrides (join table)
- `picoclaw_agents` — The agent records themselves

### Current Skill Data (7 existing rows)
Skills have a `tools` array like `["recall_memory", "store_memory"]` but these are just labels — no backend handler exists yet.

---

## What Claude Code Needs to Implement

### 1. Tool Execution Loop in `npc-ai-chat/index.ts`

The `npc-ai-chat` edge function currently does basic chat. It needs to be upgraded to:

1. **Load the agent's skills**: Query `picoclaw_agent_skills` joined with `picoclaw_skills` for the given agent
2. **Build tool schemas**: Convert each skill's `tools` array into OpenAI-compatible function definitions
3. **Call the LLM with tools**: Include the tool definitions in the chat completion request
4. **Handle tool calls**: If the LLM returns `tool_calls`, execute each one via the appropriate handler
5. **Loop**: Feed tool results back to the LLM and repeat until a final text response (up to `max_tool_iterations`)

```typescript
// Pseudocode for the loop
let messages = [...systemPrompt, ...history, userMessage];
const tools = buildToolSchemas(agentSkills);

for (let i = 0; i < maxIterations; i++) {
  const response = await callLLM(messages, tools);
  
  if (response.tool_calls) {
    for (const call of response.tool_calls) {
      const result = await executeToolHandler(call.function.name, call.function.arguments);
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  } else {
    return response.content; // Final text response
  }
}
```

### 2. Tool Handler Registry

Create `supabase/functions/_shared/tool-handlers/` with handler modules:

```
supabase/functions/_shared/tool-handlers/
├── index.ts          # Registry mapping tool names → handlers
├── memory.ts         # recall_memory, store_memory
├── sentiment.ts      # analyze_sentiment
├── imageGen.ts       # generate_image
├── webSearch.ts      # web_search
└── loreQuery.ts      # query_lore
```

Each handler exports a function: `(args: Record<string, unknown>, context: ToolContext) => Promise<unknown>`

### 3. Individual Tool Handlers

#### Memory (`recall_memory`, `store_memory`)
- `recall_memory({ player_id, query?, limit? })` → Query `agent_memory` table for recent messages
- `store_memory({ player_id, npc_id, content, metadata? })` → Insert into `agent_memory`

#### Sentiment (`analyze_sentiment`)
- `analyze_sentiment({ text })` → Call Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with a sentiment analysis prompt
- Use `LOVABLE_API_KEY` secret (already configured)
- Model: `google/gemini-3-flash-preview`

#### Image Generation (`generate_image`)
- `generate_image({ prompt, style? })` → Call the existing `generate-image` edge function internally
- Return the image URL

#### Web Search (`web_search`)
- `web_search({ query })` → Use Lovable AI Gateway or an external search API
- Return top results as structured data

#### Lore Query (`query_lore`)
- `query_lore({ query })` → Call `gemini-embed` to get embedding, then use `match_lore_chunks` DB function
- Return matching lore chunks

### 4. Tool Schema Building

Create a schema registry that maps tool names to OpenAI function definitions:

```typescript
const TOOL_SCHEMAS: Record<string, OpenAIToolDefinition> = {
  recall_memory: {
    type: 'function',
    function: {
      name: 'recall_memory',
      description: 'Retrieve past conversation memories with a player',
      parameters: {
        type: 'object',
        properties: {
          player_id: { type: 'string', description: 'The player ID' },
          query: { type: 'string', description: 'Optional search query' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
        required: ['player_id'],
      },
    },
  },
  // ... more schemas
};
```

**Option**: Instead of hardcoding, add a `tool_schemas` JSONB column to `picoclaw_skills` so schemas are stored in the DB alongside the skill. This lets the Skills Manager UI manage schemas too (future enhancement).

---

## Available Infrastructure

| Resource | Details |
|----------|---------|
| **Lovable AI Gateway** | `https://ai.gateway.lovable.dev/v1/chat/completions` — OpenAI-compatible API |
| **Gateway API Key** | Secret `LOVABLE_API_KEY` (already set) |
| **Default Model** | `google/gemini-3-flash-preview` |
| **Supabase Client** | Available in edge functions via `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| **Existing Edge Functions** | `generate-image`, `gemini-embed`, `gemini-chat`, `gemini-vision` — all callable internally |
| **DB Function** | `match_lore_chunks(query_embedding, match_count, match_threshold)` — for lore similarity search |

---

## Testing Instructions

### 1. Verify Skill Loading
```sql
-- Check skills assigned to an agent
SELECT s.* FROM picoclaw_skills s
JOIN picoclaw_agent_skills pas ON pas.skill_id = s.id
WHERE pas.agent_id = '<agent-uuid>';
```

### 2. Test Tool Execution
Send a chat message to an NPC that has the `memory` skill assigned:
```bash
curl -X POST https://ktxdbeamrxhjtdattwts.supabase.co/functions/v1/npc-ai-chat \
  -H "Content-Type: application/json" \
  -d '{
    "npcId": "<npc-id>",
    "playerId": "test-player",
    "message": "Do you remember what we talked about yesterday?",
    "sessionId": "test-session"
  }'
```

The NPC should:
1. Recognize it needs to recall memory (tool call)
2. Execute `recall_memory` handler
3. Use the results to form a contextual response

### 3. Verify Loop Termination
Ensure the loop respects `max_tool_iterations` from the agent config and doesn't infinite-loop.

### 4. Check Studio Dashboard
After implementing, the Architecture tab in the Studio Dashboard visually documents the exact flow you've built. Use it as a reference.

---

## Priority Order

1. **Tool schema registry** (hardcoded first, DB-driven later)
2. **Memory handlers** (most commonly used)
3. **Tool execution loop in npc-ai-chat**
4. **Sentiment + lore handlers**
5. **Image gen + web search handlers**
