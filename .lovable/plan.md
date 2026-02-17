

# Fix Studio to Work With Your New Supabase Project

## Problem Summary

The app was built for a different Supabase project (`sbgfyxaenvqujrbpmrdd`) with different table structures. Your new project (`ktxdbeamrxhjtdattwts`) has:
- Tables in the `public` schema (not a separate `game` schema)
- A different `agent_configs` column structure (e.g. `prompt` instead of `personality`, `spawn_config` instead of `spawn`, `is_enabled` instead of `enabled`)
- A different `agent_memory` structure (`npc_id`/`player_id`/`session_id` instead of `agent_id`/`importance`)
- Missing studio tables (`studio_workflows`, `studio_executions`, `studio_activity_log`)

## Plan

### Step 1: Fix the Supabase Client
Update `src/integrations/supabase/client.ts` to use the environment variables from `.env` instead of hardcoded old project credentials. Remove the `GameDatabase` type override and use the auto-generated `Database` type.

### Step 2: Remove the `game` Schema Helper
Since all tables are in the `public` schema, remove `src/lib/gameSchema.ts` and replace all `gameDb()` calls with the standard `supabase` client throughout the codebase (Dashboard, NPCs page, NPCFormModal, MemoryViewer).

### Step 3: Create Missing Studio Tables via Migration
Create the tables the dashboard needs:
- `studio_workflows` -- stores workflow definitions
- `studio_executions` -- stores workflow run history
- `studio_activity_log` -- stores activity feed items
- `studio_ideas` -- stores idea notes
- `studio_agent_memory` -- stores studio-side agent memory

All with permissive RLS policies (matching the existing pattern).

### Step 4: Update the NPC Builder to Match New Schema
Remap the NPCs page, NPCCard, and NPCFormModal to use the actual column names:

| Old Code | New DB Column |
|----------|--------------|
| `graphic` | `appearance` (jsonb with `sprite` key) |
| `personality` (string) | `prompt` (text) |
| `enabled` | `is_enabled` |
| `spawn` (`{map, x, y}`) | `spawn_config` (`{mapId, x, y}`) |
| `model` (`{idle, conversation}`) | `model` (jsonb with `provider`, `model`, `temperature`) |
| `inventory` | `required_tokens` (jsonb) |
| `skills` (string[]) | `skills` (jsonb) |

Also add new fields the form currently ignores: `description`, `icon`, `welcome_message`, `category`, `base_entity_type`.

### Step 5: Update MemoryViewer to Match New Schema
The `agent_memory` table now uses `npc_id` (not `agent_id`) and has `session_id`/`player_id` columns instead of `importance`. Update the query and display accordingly.

### Step 6: Update Dashboard Game Stats
Fix the Dashboard queries to use the standard `supabase` client instead of `gameDb()`. Remove references to tables that don't exist in the new project (`api_integrations`, `map_metadata`, `map_entities`) or make them gracefully handle missing tables.

### Step 7: Update Broadcast Helper
Update `src/lib/gameBroadcast.ts` to work with the correct client (already imports `supabase` so just needs to match new field names).

---

## Technical Details

### Files to modify:
- `src/integrations/supabase/client.ts` -- use env vars, use `Database` type
- `src/lib/gameSchema.ts` -- delete this file
- `src/lib/gameBroadcast.ts` -- update field references
- `src/pages/NPCs.tsx` -- remap to new schema columns
- `src/components/npcs/NPCCard.tsx` -- update props for new column names
- `src/components/npcs/NPCFormModal.tsx` -- remap form fields to new schema
- `src/components/npcs/MemoryViewer.tsx` -- use `npc_id` instead of `agent_id`
- `src/pages/Dashboard.tsx` -- remove `gameDb()`, fix game stats queries
- `src/integrations/supabase/game-types.ts` -- delete (no longer needed)

### New migration SQL:
Creates `studio_workflows`, `studio_executions`, `studio_activity_log`, `studio_ideas`, and `studio_agent_memory` tables with appropriate columns and permissive RLS policies.

