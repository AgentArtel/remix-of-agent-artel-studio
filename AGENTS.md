# Kimi RPG Studio (Agent Artel)

A visual workflow builder and AI agent management studio for creating, deploying, and managing AI-powered NPCs, game objects, and automation workflows. Integrates with a live RPGJS game via real-time Supabase sync and the PicoClaw AI agent runtime.

## Project Overview

Kimi RPG Studio provides:

- **PicoClaw Agent Builder**: Create AI agents with personality (SOUL.md), identity, LLM config, and skills. Deploy to game world or use as studio-internal agents.
- **Visual Workflow Editor**: Node-based canvas for building AI workflows with drag-and-drop
- **NPC Management**: Configure game NPCs with spawn location, sprite, skills, and AI backend
- **World Lore System**: Upload documents as fragments, decipher them turn-by-turn, RAG-powered Lorekeeper agent
- **Game Registry**: Real-time sync of game runtime data (maps, sprites, spawn points) to Studio dropdowns
- **Object Templates**: Define interactive game objects with custom actions
- **Execution Engine**: Run workflows and track execution history

### Architecture

```
Studio (React + Supabase)          Game Server (RPGJS + Node)
        |                                    |
        |--- agent_configs table ----------->| real-time sync, NPC spawning
        |--- picoclaw_agents table --------->| PicoClaw deployment
        |--- game_registry table <-----------| maps, sprites, spawn points
        |                                    |
        |--- npc-ai-chat edge function ----->| player talks to NPC
        |        |                           |
        |        +-- PicoClaw gateway ------>| tool execution (Go runtime)
        |        +-- Fallback LLM path       | direct API calls
        |                                    |
        |--- world_lore_entries + RAG        |
        |--- fragment_archive + deciphering  |
```

### Game Design Workflows

We build the **backend into the game and the game into the backend** — one integrated system. Backend tasks and logic are broken into **game-design steps** (e.g. file -> chunk/extract -> altar -> fragments -> RAG). Each step is both in-world design (NPC, altar, items) and backend (Edge Functions, DB, RAG). Full context: **docs/game-integration/GAME-DESIGN-WORKFLOWS.md**.

## Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **State** | React Query (TanStack Query) |
| **Backend** | Supabase (PostgreSQL + Edge Functions + Realtime + Storage) |
| **AI Agent Runtime** | PicoClaw (Go) on Railway |
| **Game Server** | RPGJS 4.3 (TypeScript, Tiled maps) |
| **LLM Providers** | Groq, Gemini, Kimi/Moonshot, OpenAI, Anthropic, DeepSeek |
| **Vector Search** | pgvector (768-dim Gemini embeddings) |
| **Testing** | Vitest + React Testing Library |

## Project Structure

```
studio/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui base components (50+ files)
│   │   ├── ui-custom/       # Custom UI (Sidebar, etc.)
│   │   ├── canvas/          # Workflow canvas
│   │   ├── nodes/           # Node type components (AIAgent, Code, HTTP, etc.)
│   │   ├── agents/          # PicoClaw agent components
│   │   │   ├── AgentFormModal.tsx   # Create/edit agent (Identity, Soul, LLM, Skills, Memory, Game Link tabs)
│   │   │   ├── AgentSlotCard.tsx    # Agent card in builder grid
│   │   │   ├── AgentCard.tsx        # Compact agent card
│   │   │   ├── AgentDetailPanel.tsx # Agent detail sidebar
│   │   │   ├── AgentListItem.tsx    # Agent list row
│   │   │   └── AgentChatTest.tsx    # In-Studio chat test panel
│   │   ├── npcs/            # NPC management (NPCFormModal, NPCCard)
│   │   ├── lore/            # World Lore system
│   │   │   ├── LorekeeperChat.tsx     # RAG-powered Lorekeeper conversation
│   │   │   ├── LoreNeuralNetwork.tsx  # Neural network visualization
│   │   │   ├── LoreUploader.tsx       # Document upload + chunking
│   │   │   ├── FragmentCard.tsx       # Fragment with decipher progress
│   │   │   └── LoreEntryCard.tsx      # Lore entry display
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── workflow/        # Workflow list components
│   │   ├── execution/       # Execution history
│   │   ├── map-entities/    # Map entity components
│   │   └── ...
│   ├── pages/
│   │   ├── AgentBuilder.tsx   # PicoClaw agent management (game + studio tabs)
│   │   ├── WorldLore.tsx      # Lore entries, fragments, Lorekeeper chat
│   │   ├── NPCs.tsx           # NPC configuration
│   │   ├── WorkflowEditorPage.tsx # Visual workflow editor
│   │   ├── Dashboard.tsx      # Home dashboard
│   │   └── ...
│   ├── hooks/
│   │   ├── usePicoClawAgents.ts  # Agent CRUD, deploy, link, studio agents
│   │   ├── useAgentConfigs.ts    # Game NPC configs (agent_configs table)
│   │   ├── useGameRegistry.ts    # Dynamic dropdowns from game_registry
│   │   ├── useWorldLore.ts       # Lore entry CRUD, chunk search, RAG
│   │   ├── useFragments.ts       # Fragment decipher mutations
│   │   ├── useExecution.ts       # Workflow execution engine with tool loop
│   │   └── ...
│   ├── lib/
│   │   ├── geminiServices.ts       # Gemini chat/embed/vision wrappers
│   │   ├── studioMemoryService.ts  # Studio agent memory (load/save)
│   │   └── ...
│   └── integrations/supabase/    # Supabase client + auto-generated types
├── supabase/
│   ├── functions/
│   │   ├── npc-ai-chat/       # NPC conversation (PicoClaw routing + LLM fallback)
│   │   ├── picoclaw-bridge/   # Agent deploy/stop/chat/status/generate-config
│   │   ├── decipher-fragment/ # Turn-based chunk reveal + embedding
│   │   ├── embed-lore/        # Generate 768-dim embeddings for lore chunks
│   │   ├── extract-lore-text/ # PDF/text extraction + chunking
│   │   ├── generate-image/    # Gemini Imagen 4.0 image generation
│   │   ├── gemini-chat/       # Gemini AI chat (with JSON mode)
│   │   ├── gemini-embed/      # Gemini text embeddings
│   │   ├── kimi-chat/         # Kimi/Moonshot AI chat
│   │   ├── studio-run/        # Workflow execution engine
│   │   ├── object-action/     # Game object interaction handler
│   │   └── workflow-scheduler/ # Cron-scheduled workflow execution
│   └── migrations/            # Database migrations (30+)
├── tasks/                     # Task handoff files for AI agents
│   └── claude-code/           # Tasks assigned to Claude Code
├── docs/                      # Architecture and design docs
│   └── game-integration/      # Game integration specs
└── .lovable/plan.md           # Lovable agent's current roadmap
```

## PicoClaw Agent System

### What is PicoClaw

PicoClaw is a Go-based AI agent runtime that provides:
- Multi-agent orchestration with isolated workspaces
- Personality via markdown files (SOUL.md, IDENTITY.md, USER.md, AGENTS.md)
- Tool calling with configurable max iterations
- Session memory with long-term memory support
- Multiple LLM backends (Groq, Gemini, OpenAI, Anthropic, Kimi, DeepSeek)

**Deployed on Railway:** `picoclaw-production-40dc.up.railway.app` (port 18790)

### Agent Types

| Type | Purpose | Memory Table | Example |
|------|---------|-------------|---------|
| `game` | NPCs in the RPGJS game world | `agent_memory` | Village Elder, Merchant |
| `studio` | Internal Studio assistants | `studio_agent_memory` | The Lorekeeper |

### Agent Deployment Flow

1. **Create** agent in Agent Builder (identity, soul, LLM config, skills)
2. **Link** to game entity via Game Link tab (or create new NPC)
3. **Deploy** pushes config to PicoClaw gateway, sets `deployment_status = 'running'`
4. **Player talks** to NPC -> `npc-ai-chat` finds linked PicoClaw agent -> routes through gateway
5. **Unlink** removes connection, NPC falls back to standard LLM routing

### Key Edge Function: `picoclaw-bridge`

Actions: `deploy`, `stop`, `chat`, `status`, `generate-config`, `sync-memory`

Builds full PicoClaw config from all deployed agents, generates workspace files (SOUL.md, skills/), and POSTs to the admin endpoint.

## Game Registry

The `game_registry` table syncs runtime game data to Studio for dynamic form dropdowns.

### How It Works

1. **Game server boots** -> `gameRegistrySync.ts` reads available maps from RPGJS, parses TMX spawn points, and upserts everything to `game_registry`
2. **Studio reads** via `useGameRegistry(type)` hook -> populates map, sprite, category, skill, and spawn_point dropdowns in NPCFormModal and AgentFormModal

### Registry Types

| Type | Source | Used In |
|------|--------|---------|
| `map` | RPGJS `sceneMap.getMaps()` | Map selection dropdowns |
| `sprite` | Known sprite files (female, hero) | Sprite selection dropdowns |
| `spawn_point` | TMX `type="start"` and `type="spawn"` objects | Spawn point preset picker |
| `category` | Hardcoded defaults (NPC, Merchant, etc.) | Category dropdowns |
| `skill` | Hardcoded defaults (move, say, look, etc.) | Skill dropdowns |

### TMX Spawn Points

Maps should have a dedicated `spawn_points` object layer in Tiled with `type="spawn"` point objects. The parser also reads `type="start"` objects from any layer. These sync to `game_registry` with `registry_type = 'spawn_point'` and metadata containing `{ mapId, x, y }`.

## World Lore & Fragment System

### Overview

Media uploads become **Fragments** — encrypted artifacts deciphered incrementally through player turns. The Lorekeeper agent's knowledge evolves as fragments are revealed.

### Turn-Based Deciphering

```
Upload -> [sealed] (0% revealed, Lorekeeper knows nothing)
  |
  v  (Player spends a turn)
[speculative] (1-33% revealed, vague hints)
  |
  v  (More turns)
[partial] (34-66%, useful but incomplete)
  |
  v
[confirmed] (67-100%, full knowledge)
```

### Key Tables

- `world_lore_entries` — Source documents (title, type, content, storage path)
- `lore_embeddings` — Vector chunks with `is_revealed` flag, 768-dim Gemini embeddings
- `fragment_archive` — Fragment progress tracking (total_chunks, revealed_chunks, certainty_level)

### RAG Function

`match_lore_chunks(query_embedding, match_count, match_threshold)` — Returns only revealed chunks (`WHERE is_revealed = true`), constraining the Lorekeeper to deciphered knowledge.

### Edge Functions

- `extract-lore-text` — PDF/text extraction + chunking via Gemini
- `embed-lore` — Generate 768-dim embeddings, supports `storeOnly` mode for sealed fragments
- `decipher-fragment` — Reveal N chunks per turn, generate embeddings, update progress

## Skill Execution System (In Progress)

Skills in `picoclaw_skills` define tools with OpenAI-compatible JSON schemas. Currently, `npc-ai-chat` hardcodes 3 tool definitions and returns tool calls raw. The planned system will:

1. **Dynamically load** tool schemas from `picoclaw_agent_skills` + `picoclaw_skills` per agent
2. **Execute server-side tools** (memory recall/store, sentiment analysis, image generation) in a loop
3. **Pass through game-side tools** (move, say, teleport) to the game client unchanged
4. **Support all LLM providers** (add tool calling to Kimi and Gemini callers)

Architecture: `supabase/functions/_shared/tools/` with registry, executor, and handler modules.

Full spec: `tasks/claude-code/TASK-skill-execution-system.md`

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `picoclaw_agents` | AI agent definitions (identity, LLM config, agent_type, deployment_status) |
| `picoclaw_skills` | Skill library with tool schemas (tools JSONB), categories, markdown docs |
| `picoclaw_agent_skills` | Agent-to-skill assignments with config overrides |
| `agent_configs` | Game NPC configurations (name, personality, spawn, skills, model) |
| `agent_memory` | Game agent conversation history (session_id, role, content) |
| `studio_agent_memory` | Studio agent conversation history (agent_id, session_id) |

### World Lore Tables

| Table | Purpose |
|-------|---------|
| `world_lore_entries` | Uploaded documents with metadata |
| `lore_embeddings` | Vector chunks with is_revealed flag for turn-based deciphering |
| `fragment_archive` | Fragment progress (total_chunks, revealed_chunks, certainty_level) |

### Game & Workflow Tables

| Table | Purpose |
|-------|---------|
| `game_registry` | Runtime game data synced for Studio dropdowns |
| `studio_workflows` | Workflow definitions (nodes, connections) |
| `studio_executions` | Workflow run history |
| `object_templates` | Interactive game object definitions |
| `object_instances` | Placed object instances on maps |
| `player_state` | Real-time player positions |
| `workflow_schedules` | Cron schedules for workflows |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `npc-ai-chat` | NPC conversation: PicoClaw routing -> LLM fallback with tool calling |
| `picoclaw-bridge` | Agent deployment, config generation, chat routing |
| `decipher-fragment` | Turn-based chunk reveal + embedding generation |
| `embed-lore` | Generate 768-dim Gemini embeddings for lore chunks |
| `extract-lore-text` | PDF/text extraction and chunking |
| `generate-image` | Gemini Imagen 4.0 image generation |
| `gemini-chat` | Gemini AI chat with JSON mode support |
| `gemini-embed` | Gemini text embeddings |
| `kimi-chat` | Kimi/Moonshot AI chat |
| `studio-run` | Workflow execution engine |
| `object-action` | Game object interaction handler |
| `workflow-scheduler` | Cron-scheduled workflow execution |

## Infrastructure

- **Supabase:** Project `ktxdbeamrxhjtdattwts` — PostgreSQL, Edge Functions, Realtime, Storage
- **Railway:** PicoClaw at `picoclaw-production-40dc.up.railway.app` (PORT=18790)
- **LLM Providers:** Groq (fast), Gemini (analytical), Kimi/Moonshot, OpenAI, Anthropic, DeepSeek
- **Storage Buckets:** `world-lore` (documents), `fragments` (media)

## Build & Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 8080)
npm run build        # Production build
npm run lint         # Run ESLint
npm test             # Run Vitest
```

### Database Migrations

```bash
supabase migration new migration_name
supabase db push
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

## Code Style

- **TypeScript**: ES2020 target, ESNext modules, path alias `@/*` -> `./src/*`
- **Styling**: Tailwind CSS with green accent theme (`#79F181`), `cn()` utility for class merging
- **Components**: PascalCase files, shadcn/ui base, Radix primitives
- **Hooks**: camelCase with `use` prefix
- **Toasts**: `sonner` library (`toast.success()`, `toast.error()`)
- **Forms**: react-hook-form + Zod validation

### Node Types (Workflow Editor)

- **Triggers**: `trigger`, `webhook`, `schedule`
- **AI**: `ai-agent`, `openai-chat`, `anthropic-chat`, `gemini-chat`, `gemini-vision`
- **Logic**: `if`, `merge`, `set`, `code-tool`
- **Integrations**: `http-tool`, `gmail`, `slack`
- **Game**: `game-show-text`, `game-give-item`, `game-teleport`, `game-set-variable`
- **Utility**: `image-gen`, `memory`

## Security

1. **Supabase RLS**: Permissive policies for dev — tighten for production
2. **Edge Functions**: JWT verification disabled for dev (`verify_jwt = false`)
3. **API Keys**: Stored as Supabase secrets, never exposed to client
4. **PicoClaw**: `generate-config` strips API keys from client-facing responses

## Related Documentation

- `.lovable/plan.md` — Current roadmap (fragment deciphering, skill execution)
- `docs/game-integration/` — Game architecture, NPC builder spec, design workflows
- `tasks/claude-code/` — Task handoffs for Claude Code implementation
