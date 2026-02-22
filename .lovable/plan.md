

# Add 8 New Architecture Diagrams + Sidebar Categories

## Summary

Add 8 new system diagrams to the Architecture page and organize all 14 diagrams into categorized sections in the left sidebar rail. No layout changes -- just more diagrams and section headers.

## New Diagrams

| # | Name | Category | Nodes | Key Edge Functions | Key Tables |
|---|------|----------|-------|--------------------|------------|
| 7 | Authentication Flow | Infrastructure | Login -> Supabase Auth -> AuthContext -> Protected Routes -> Session | (client-side) | profiles |
| 8 | Credential Management | Infrastructure | Store Request -> manage-credential -> Encrypt -> Store -> Retrieve -> Decrypt -> Use | manage-credential | studio_credentials |
| 9 | Memory Service Pipeline | Core | Chat Msg -> Save Memory -> Game Path (agent_memory) / Studio Path (studio_agent_memory) -> Load Window -> Build Context -> Return | npc-ai-chat | agent_memory, studio_agent_memory |
| 10 | Workflow Scheduler | Infrastructure | pg_cron Tick -> workflow-scheduler -> Find Due -> Load Steps -> Execute -> Save Run -> Update Schedule | workflow-scheduler, studio-run | workflow_schedules, workflow_templates, workflow_runs |
| 11 | Realtime Broadcasting | Game | Studio Action -> DB Write -> gameBroadcast -> Supabase Realtime -> Channel Listeners -> Game Client | npc-ai-chat | agent_configs, fragment_archive |
| 12 | Image Generation | Infrastructure | Request -> generate-image -> Validate -> Build Prompt -> Imagen API -> Safety Check -> Return | generate-image | (stateless) |
| 13 | Game Registry Sync | Game | Game Boot -> Upsert Registry -> Studio Query -> useGameRegistry -> Filter -> Render | (direct DB) | game_registry, map_regions |
| 14 | Lore RAG Search | Content | Query -> gemini-embed -> Embedding -> match_lore_chunks RPC -> Cosine Search -> Top Chunks -> LLM Context -> Response | gemini-embed | lore_embeddings, world_lore_entries |

## Sidebar Categories

The left rail gets small section headers grouping diagrams:

- **CORE** -- NPC Chat Pipeline, PicoClaw Deploy, Studio Workflow Execution, Memory Service Pipeline
- **CONTENT** -- Lore Ingestion (renamed from "Lore Pipeline"), Lore RAG Search
- **GAME** -- Game Object Actions, Game Registry Sync, Realtime Broadcasting
- **INFRASTRUCTURE** -- AI Services, Authentication, Credential Management, Workflow Scheduler, Image Generation

## Technical Details

### `src/components/dashboard/architectureDiagrams.ts`

- Add `category: string` to `SystemDiagram` interface
- Add category to all 6 existing diagrams
- Define 8 new diagram data blocks following the same `row(col, rowIdx)` pattern for horizontal node layout
- Rename "Lore Pipeline" to "Lore Ingestion" for clarity alongside the new "Lore RAG Search"
- Icons for new diagrams: Shield (Auth), Key (Credentials), Brain (Memory), Clock (Scheduler), Radio (Broadcasting), ImageIcon (Image Gen), Map (Registry), Search (RAG)

### `src/components/dashboard/ArchitectureView.tsx`

- Group `SYSTEM_DIAGRAMS` by category in the left rail
- Render category headers between groups:
  ```
  CORE
    [NPC Chat Pipeline]
    [PicoClaw Deploy]
    ...
  CONTENT
    [Lore Ingestion]
    [Lore RAG Search]
  GAME
    ...
  ```
- Category order: Core, Content, Game, Infrastructure
- Headers styled as `text-[10px] font-bold uppercase tracking-wider text-muted-foreground`

### `src/components/dashboard/SystemCard.tsx`

No changes needed.

