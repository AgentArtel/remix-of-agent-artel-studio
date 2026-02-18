# Task Brief: Fix Studio NPC Management for Public Schema

## Objective
Update the Studio frontend to work with the `public` database schema instead of `game` schema, ensuring NPC management works end-to-end with the game server.

## Background
The game server now uses the `public` schema (not `game` schema) because Supabase PostgREST only exposes `public` by default. The Studio code is still trying to use `game` schema.

## Files to Update

### 1. `src/lib/gameSchema.ts`
**Current:**
```typescript
export const gameDb = () => supabase.schema('game');
```

**Change to:**
```typescript
export const gameDb = () => supabase; // Use public schema
```

### 2. `src/pages/NPCs.tsx`
Check and update:
- Column names: `enabled` → `is_enabled`
- Data structure mapping for database compatibility

### 3. `src/components/npcs/NPCCard.tsx`
Check props and types match database schema

### 4. `src/components/npcs/NPCFormModal.tsx`
Check form fields match database schema:
- `spawn` → `spawn_config`
- `personality` → `prompt`
- `graphic` → `default_sprite`
- etc.

## Database Schema Reference

Tables are in `public` schema:
- `agent_configs` - NPC configurations
- `agent_memory` - Conversation history
- `player_state` - Player tracking

### agent_configs columns:
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
category TEXT DEFAULT 'npc'
base_entity_type TEXT DEFAULT 'ai-npc'
default_sprite TEXT
icon TEXT DEFAULT '🤖'
description TEXT
prompt TEXT NOT NULL  -- NOT personality
welcome_message TEXT DEFAULT 'Hello!'
model JSONB  -- {provider, conversation, temperature}
skills JSONB DEFAULT '[]'  -- array of {name, description}
required_tokens JSONB DEFAULT '[]'
personality JSONB
memory_config JSONB
spawn_config JSONB  -- {mapId, x, y} NOT spawn
appearance JSONB  -- {sprite, animations}
behavior JSONB  -- {wander, wanderRadius, etc}
is_enabled BOOLEAN DEFAULT true  -- NOT enabled
created_at TIMESTAMP
updated_at TIMESTAMP
```

## Verification Steps

1. Start Studio: `npm run dev` in studio folder
2. Navigate to NPCs page
3. Should see existing NPCs (Elara, Town Guard)
4. Create a new NPC
5. Verify it appears in database (Table Editor)
6. Verify it spawns in game (within 2 seconds)
7. Edit NPC position
8. Verify it updates in game immediately
9. Delete NPC
10. Verify it disappears from game

## Success Criteria
- [ ] Studio shows existing NPCs from database
- [ ] Can create new NPCs
- [ ] Can edit existing NPCs
- [ ] Can delete NPCs
- [ ] Changes sync to game in real-time (< 2 seconds)
- [ ] No schema-related errors in browser console

## Current State
- Game server works with `public` schema
- Database tables exist in `public` schema
- Studio uses `game` schema (needs update)
- Edge function works for AI chat
