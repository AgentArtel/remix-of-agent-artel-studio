
# Architect Agent: AI-Powered Architecture Diagram Generator

## Summary

Create a new internal studio PicoClaw agent called **"the-architect"** whose sole purpose is to analyze real system code and produce accurate architecture diagrams (workflow schemas) for the Architecture page. Instead of the current static `getGameScaffoldNodes()` template, clicking "Map Game Integration" will chat with the-architect, which reads actual edge function code, database schema, and existing diagrams, then returns a valid `{ nodes, connections }` JSON that gets saved and displayed.

The agent uses persistent memory via `studio_agent_memory` so it remembers every diagram it has generated and can reference them when building new ones.

---

## Current Problem

- `getGameScaffoldNodes()` always returns the same 3 hardcoded game nodes regardless of which system is selected
- The diagrams are "visual euphoria" -- they look nice but don't reflect real code paths
- No intelligence evaluates the actual edge function implementations, database tables, or connection patterns

## Solution Architecture

```text
User clicks "Map Game Integration"
  --> ArchitectureView sends system metadata to edge function
  --> scaffold-game-design edge function
      --> Builds context from: system diagram metadata + code summaries + DIAGRAM-TEMPLATE.md rules
      --> Calls the-architect agent via picoclaw-bridge (if deployed) or Lovable AI directly
      --> Agent uses persistent memory to recall past diagrams
      --> Returns structured JSON: { nodes: NodeData[], connections: Connection[] }
  --> ArchitectureView saves to studio_workflows and renders
```

---

## What Gets Built

### 1. New PicoClaw Agent Record: `the-architect`

Insert into `picoclaw_agents` via a DB migration:

| Field | Value |
|-------|-------|
| `picoclaw_agent_id` | `the-architect` |
| `agent_type` | `studio` |
| `llm_backend` | `gemini` |
| `llm_model` | `gemini-3-flash-preview` |
| `soul_md` | Architect personality and constraints (detailed below) |
| `identity_md` | Role definition -- analyzes code systems and produces workflow schemas |
| `deployment_status` | `draft` |
| `memory_enabled` | `true` |
| `max_tool_iterations` | `5` |
| `temperature` | `0.3` (low for structured output accuracy) |

**SOUL.md content** (stored in `soul_md` column):
- You are the-architect, an internal studio agent for Kimi RPG Studio
- Your only job is to analyze system code and produce architecture diagrams as JSON
- You output ONLY valid JSON matching the NodeData/Connection schema
- You know all available node types: trigger, webhook, code-tool, http-tool, memory, ai-agent, picoclaw-agent, game-show-text, game-give-item, game-give-gold, game-teleport, game-open-gui, game-set-variable
- You use the `row(col, rowIdx)` positioning with NODE_GAP_X=280, NODE_GAP_Y=180
- Connection format: `{ id, from, to, fromPort: 'output', toPort: 'input', label? }`
- Every node needs: id (prefixed), type, position, title, subtitle, isConfigured
- You remember every diagram you have produced (via persistent memory)
- When asked about a system, you analyze the provided code/metadata to map the REAL execution flow, not a generic template

### 2. New Edge Function: `supabase/functions/scaffold-game-design/index.ts`

This function:

1. Receives system diagram metadata (title, description, nodes summary, edge functions, tables)
2. Loads the-architect agent record from `picoclaw_agents`
3. Loads the-architect's memory from `studio_agent_memory` (last 20 messages for context)
4. Builds a detailed prompt that includes:
   - The system's metadata (title, nodes, edge functions, tables)
   - The DIAGRAM-TEMPLATE rules (node types, positioning, connection format)
   - Instruction to produce a game integration diagram showing how the system connects to game runtime
5. Calls Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`) with tool calling to extract structured output
6. Uses a `generate_diagram` tool definition to force structured JSON output:
   ```
   {
     name: "generate_diagram",
     parameters: {
       nodes: [{ id, type, position: {x,y}, title, subtitle, isConfigured }],
       connections: [{ id, from, to, fromPort, toPort, label? }]
     }
   }
   ```
7. Saves the conversation (user prompt + assistant response) to `studio_agent_memory` with `agent_id = 'the-architect'` and `session_id = 'architect-diagrams'`
8. Returns the parsed nodes and connections

**Why tool calling instead of raw JSON?** Tool calling with a schema definition guarantees the LLM returns properly structured output matching NodeData/Connection types. No parsing guesswork.

### 3. Update `src/components/dashboard/ArchitectureView.tsx`

Change the create mutation to:
- Call the new `scaffold-game-design` edge function instead of `getGameScaffoldNodes()`
- Show loading state: "Architect is analyzing..." with a Brain icon animation
- On success, save the returned nodes/connections to `studio_workflows` as before
- On failure (edge function error, timeout), fall back to `getGameScaffoldNodes()` with a toast: "Architect unavailable, using template"
- Keep `getGameScaffoldNodes()` as the static fallback -- no changes needed there

### 4. Add `supabase/config.toml` entry

```toml
[functions.scaffold-game-design]
verify_jwt = false
```

### 5. Update `docs/architecture/DIAGRAM-TEMPLATE.md`

Add a section at the bottom:

```markdown
## AI-Powered Generation (the-architect)

Instead of manually writing diagrams, you can use the-architect studio agent.
Send system metadata to `scaffold-game-design` edge function and it will
produce a valid diagram JSON using persistent memory of all past diagrams.

The agent is stored in `picoclaw_agents` with `picoclaw_agent_id = 'the-architect'`
and uses `studio_agent_memory` for conversation persistence.
```

---

## Technical Details

### Edge Function: `scaffold-game-design/index.ts`

```text
POST body:
{
  systemId: string,
  systemTitle: string,
  systemDescription: string,
  nodesSummary: [{ id, type, title, subtitle }],
  edgeFunctions: string[],
  tables: string[]
}

Response:
{
  success: true,
  nodes: NodeData[],
  connections: Connection[]
}
```

The prompt sent to the LLM includes:
1. System metadata from the request body
2. Available node types and their purposes (from DIAGRAM-TEMPLATE)
3. Positioning rules (row/col grid)
4. Instruction: "Produce a game integration diagram showing how {systemTitle} connects to game runtime. Include PicoClaw agent routing, relevant game action nodes, and realistic connections based on what this system actually does."
5. Previous diagrams from memory for consistency

### Memory Flow

- Session ID: `architect-diagrams` (single persistent session)
- Agent ID: `the-architect`
- After each successful generation, both the prompt and the response are saved to `studio_agent_memory`
- On next invocation, the last 20 messages are loaded as conversation history
- This means the agent remembers: "I already generated a game integration for NPC Chat Pipeline with these nodes..." and can maintain consistency

### Database Changes

One migration to insert the-architect agent record:

```sql
INSERT INTO picoclaw_agents (
  picoclaw_agent_id, agent_type, llm_backend, llm_model,
  soul_md, identity_md, temperature, max_tokens,
  max_tool_iterations, memory_enabled, deployment_status
) VALUES (
  'the-architect', 'studio', 'gemini', 'gemini-3-flash-preview',
  '<soul_md content>', '<identity_md content>',
  0.3, 4096, 5, true, 'draft'
);
```

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/scaffold-game-design/index.ts` | New edge function -- calls Lovable AI with structured tool calling, manages architect memory |
| `src/components/dashboard/ArchitectureView.tsx` | Update create mutation to call edge function, add loading state, fallback to static |
| `supabase/config.toml` | Add `scaffold-game-design` entry |
| `docs/architecture/DIAGRAM-TEMPLATE.md` | Add AI generation section |
| DB migration | Insert `the-architect` agent record into `picoclaw_agents` |

### Secrets Used

- `LOVABLE_API_KEY` -- already configured, used to call Lovable AI Gateway
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` -- already configured, used for DB reads/writes

No new secrets needed.
