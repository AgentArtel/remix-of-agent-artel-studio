

# Add Agent Architecture Diagrams + Documentation Template

## Overview

Add 3 new architecture diagrams covering the agent ecosystem (PicoClaw Agents, Studio Agents, NPC Agents) under a new **"Agents"** sidebar category, then create a documentation file that other AI agents can follow to add new diagrams.

## New Diagrams

### 1. PicoClaw Agent Lifecycle (Category: Agents)

Shows the full lifecycle of a PicoClaw agent from creation through deployment, chat, and stopping.

```text
Create Agent --> Save to DB (picoclaw_agents) --> Assign Skills (picoclaw_agent_skills)
    --> Link Game Entity (agent_config_id) --> Deploy (picoclaw-bridge)
    --> Build Config (merge .md files + skills) --> Push to Gateway
    --> Chat Loop (message -> gateway -> tool loop -> response)
    --> Stop Agent (remove from gateway, update status)
```

- **Nodes (9):** Create Agent (trigger), Save to DB (memory), Assign Skills (memory), Link Game Entity (memory), picoclaw-bridge Deploy (webhook), Build Config (code-tool), Push to Gateway (http-tool), Agent Running (picoclaw-agent), Stop Agent (trigger)
- **Edge functions:** picoclaw-bridge
- **Tables:** picoclaw_agents, picoclaw_skills, picoclaw_agent_skills, agent_configs

### 2. Studio Agent Pipeline (Category: Agents)

Shows how studio-internal agents (like the Lorekeeper) work -- separate from game NPCs, with dedicated memory and session handling.

```text
Studio UI Chat --> Determine Agent Type (studio) --> Load Studio Memory (studio_agent_memory)
    --> Build Context (system prompt + history) --> Route to LLM
        --> PicoClaw Gateway path (if deployed)
        --> Direct LLM path (gemini-chat / picoclaw-bridge fallback)
    --> Save Studio Memory --> Return Response
```

- **Nodes (9):** Studio Chat Input (trigger), Check Agent Type (code-tool), Load Studio Memory (memory), Build Context (code-tool), PicoClaw Gateway (http-tool), Direct LLM (webhook), Save Studio Memory (memory), studioMemoryService (code-tool), Return Response (trigger)
- **Edge functions:** picoclaw-bridge, npc-ai-chat
- **Tables:** picoclaw_agents, studio_agent_memory

### 3. NPC Agent Mapping (Category: Agents)

Shows how game NPCs (agent_configs) connect to PicoClaw agents and how the game client interacts with them.

```text
Studio NPC Form --> Save agent_configs --> Broadcast (content_broadcast)
    --> Game Client Receives --> Spawn NPC in Map
    --> Player Talks to NPC --> npc-ai-chat --> Check PicoClaw Link
        --> PicoClaw path (deployed agent) / Fallback path (direct LLM)
    --> Fragment Delivery path (if fragment attached)
        --> Check Skills --> Decipher Fragment --> Broadcast game_events
```

- **Nodes (10):** NPC Form (trigger), Save Config (memory), Broadcast Created (code-tool), Game Client (trigger), Player Chat (trigger), npc-ai-chat (webhook), PicoClaw Check (code-tool), Gateway Route (http-tool), Fragment Check (code-tool), Decipher (webhook)
- **Edge functions:** npc-ai-chat, picoclaw-bridge, decipher-fragment
- **Tables:** agent_configs, agent_memory, picoclaw_agents, fragment_archive

## Sidebar Update

Add a new category **"Agents"** to `DIAGRAM_CATEGORIES`, positioned after "Core":

```text
CORE
  NPC Chat Pipeline
  PicoClaw Agent Deployment
  Studio Workflow Execution
  Memory Service Pipeline
AGENTS          <-- new
  PicoClaw Agent Lifecycle
  Studio Agent Pipeline
  NPC Agent Mapping
CONTENT
  Lore Ingestion
  Lore RAG Search
GAME
  Game Object Actions
  Game Registry Sync
  Realtime Broadcasting
INFRASTRUCTURE
  AI Services
  Authentication Flow
  Credential Management
  Workflow Scheduler
  Image Generation
```

## Documentation Template

Create `docs/architecture/DIAGRAM-TEMPLATE.md` -- a guide for other AI agents to follow when adding new architecture diagrams. It will contain:

1. **File to edit:** `src/components/dashboard/architectureDiagrams.ts`
2. **Interface reference:** `SystemDiagram` fields explained
3. **Node types available:** All registered types from `CanvasNode.tsx` (trigger, webhook, code-tool, http-tool, memory, ai-agent, picoclaw-agent, game-show-text, etc.) with their icons and colors
4. **Step-by-step template:** Copy-paste TypeScript block with placeholder values
5. **Positioning guide:** How `row(col, rowIdx)` works, `NODE_GAP_X` and `NODE_GAP_Y` values
6. **Connection format:** `Connection` interface with `from`, `to`, `fromPort`, `toPort`, `label`
7. **Category options:** The valid categories and when to use each
8. **Registration:** Where to add the diagram in `SYSTEM_DIAGRAMS` array
9. **Validation checklist:** Unique IDs, matching connection refs, correct category

## Technical Details

### Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/architectureDiagrams.ts` | Add 3 new diagram definitions (PicoClaw Lifecycle, Studio Agent Pipeline, NPC Agent Mapping), add 'Agents' to `DIAGRAM_CATEGORIES`, update category type |
| `src/components/dashboard/ArchitectureView.tsx` | No changes needed -- already iterates `DIAGRAM_CATEGORIES` dynamically |
| `docs/architecture/DIAGRAM-TEMPLATE.md` | New file -- documentation template for other agents |

### Category Type Update

The `SystemDiagram` interface `category` field changes from:
```typescript
category: 'Core' | 'Content' | 'Game' | 'Infrastructure';
```
to:
```typescript
category: 'Core' | 'Agents' | 'Content' | 'Game' | 'Infrastructure';
```

And `DIAGRAM_CATEGORIES` changes from:
```typescript
export const DIAGRAM_CATEGORIES = ['Core', 'Content', 'Game', 'Infrastructure'] as const;
```
to:
```typescript
export const DIAGRAM_CATEGORIES = ['Core', 'Agents', 'Content', 'Game', 'Infrastructure'] as const;
```

### New Icons

- PicoClaw Lifecycle: `Bot` with `text-teal-400 bg-teal-500/20`
- Studio Agent Pipeline: `Sparkles` with `text-violet-400 bg-violet-500/20`  
- NPC Agent Mapping: `Users` (new import from lucide-react) with `text-emerald-400 bg-emerald-500/20`

