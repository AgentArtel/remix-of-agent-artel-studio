

# Glasses Agent Memory — Extend `studio_agent_memory` with a `source` Column

## Why Not a New Table

Creating a separate `glasses_agent_memory` table with an identical schema would duplicate structure unnecessarily. The `studio_agent_memory` table already has the right columns (`agent_id`, `session_id`, `role`, `content`, `metadata`, `created_at`). What's missing is a way to distinguish *where* the conversation originated.

## Solution

Add a `source` column to `studio_agent_memory` that tags the origin context:

- `'studio'` — default, existing Studio agent chats
- `'glasses'` — Even G1 / AR glasses agent chats  
- `'bridge'` — external bridge requests (ClawLens, etc.)

This lets the `memory` action in picoclaw-bridge filter by source when needed, and keeps all agent memory queryable from one table.

## Changes

### 1. Database Migration

```sql
ALTER TABLE studio_agent_memory
  ADD COLUMN source text NOT NULL DEFAULT 'studio';
```

No data loss. All existing rows get `'studio'` as default.

### 2. Edge Function — `supabase/functions/picoclaw-bridge/index.ts`

**In `handleChat`** (where memory is saved, around line 330): Add `source` field to the insert. Derive source from the agent's `agent_type`:
- `agent_type = 'glasses'` → `source = 'glasses'`
- `agent_type = 'studio'` → `source = 'studio'`
- Otherwise → `source = 'bridge'`

The `agent_type` is already selected in the agent lookup query.

**Add `handleMemory` handler** (new function):
- Accepts `{ agentId, sessionId?, source?, limit? }`
- Resolves `agentId` using the existing UUID-vs-slug logic
- Queries `studio_agent_memory` filtered by `agent_id`, optionally by `session_id` and `source`
- Returns `{ success: true, data: [...] }` with `id, role, content, session_id, source, created_at`
- Default limit 50, max 200

**Add `handleKnowledge` handler** (new function):
- Accepts `{ agentId, tags? }`
- Queries `world_lore_entries`, filtering by `tags` overlap if provided
- Returns `{ success: true, data: [...] }` with `id, title, entry_type, content, summary, tags, created_at`
- Limit 100, ordered by `updated_at desc`

**Update switch statement** to add `'memory'` and `'knowledge'` cases.

### 3. No New Tables

Everything stays in `studio_agent_memory`. The `source` column provides the separation between studio, glasses, and external bridge contexts.

