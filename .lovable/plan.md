

# Sync NPC Config Dropdowns with Game Data

## Problem
The NPC form has hardcoded dropdown options (maps, sprites, categories, spawn points) that don't reflect what actually exists in the game. If someone types "main" as a map but the game only has "simplemap", the NPC spawns nowhere.

## Solution
Create a **`game_registry`** table in Supabase that the game server populates with its available maps, sprites, spawn points, and categories. The Studio reads from this table to populate dropdowns dynamically.

---

## Part 1: Studio Side (Lovable)

### 1A. New Database Table: `game_registry`

A single flexible registry table the game server writes to:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid (PK) | Auto-generated |
| `registry_type` | text | `map`, `sprite`, `spawn_point`, `category`, `skill` |
| `key` | text | Unique identifier (e.g., `simplemap`, `female`) |
| `label` | text | Display name (e.g., "Simple Map", "Female Villager") |
| `metadata` | jsonb | Extra info (map dimensions, spawn coords, sprite preview URL) |
| `is_active` | boolean | Whether it's currently available |
| `updated_at` | timestamptz | Last sync time |

Unique constraint on `(registry_type, key)` so game server can upsert.

### 1B. New Hook: `useGameRegistry`

A React Query hook that fetches registry entries by type:

```typescript
useGameRegistry('map')    // returns available maps
useGameRegistry('sprite') // returns available sprites
useGameRegistry('spawn_point') // returns pre-defined spawn points
```

### 1C. Update NPCFormModal

Replace hardcoded dropdowns with dynamic ones:

- **Map ID**: Dropdown populated from `game_registry` where `registry_type = 'map'`; fallback to manual text input if no maps registered yet
- **Sprite**: Dropdown from `game_registry` where `registry_type = 'sprite'`; fallback to current hardcoded list
- **Spawn Point**: New "pick from presets" option alongside manual X/Y entry; presets come from `game_registry` where `registry_type = 'spawn_point'` and metadata contains `{mapId, x, y}`
- **Category**: Dropdown from `game_registry` where `registry_type = 'category'`; fallback to current hardcoded list

Each dropdown shows a "manual entry" toggle so users can still type custom values if needed.

### 1D. Seed Initial Data

Insert known values from current database usage so dropdowns aren't empty before the game syncs:

- Maps: `simplemap`, `main`
- Sprites: `female`, `hero`, `male`
- Categories: `npc`, `merchant`, `quest`, `guard`
- Skills: `move`, `say`, `look`, `emote`, `wait`

---

## Part 2: Game Server Side (Cursor Agent Handoff)

The game server needs to populate and keep `game_registry` in sync. Here is the specification for the Cursor agent:

### Task: Implement Game Registry Sync

**Table:** `public.game_registry` (created by Studio migration)

**What to sync:**

| registry_type | Source | key | metadata |
|---------------|--------|-----|----------|
| `map` | RPG-JS map loader | Map file ID (e.g., `simplemap`) | `{width, height, tileWidth, tileHeight, displayName}` |
| `sprite` | Spritesheet registry | Sprite ID (e.g., `female`) | `{spritesheet, frameWidth, frameHeight, preview}` |
| `spawn_point` | Map object layer | Named spawn objects | `{mapId, x, y, label}` |
| `category` | Static config or DB | Category slugs | `{label, description}` |
| `skill` | Game skill registry | Skill names | `{description, params}` |

**Sync approach:**
- On server startup, upsert all known maps, sprites, spawn points into `game_registry`
- Use Supabase client: `supabase.from('game_registry').upsert([...], { onConflict: 'registry_type,key' })`
- Optionally re-sync when maps are hot-reloaded

**Supabase connection:** Use the existing Supabase client config already in the game server (public schema, same project).

**Example upsert:**
```typescript
await supabase.from('game_registry').upsert([
  { registry_type: 'map', key: 'simplemap', label: 'Simple Map', metadata: { width: 640, height: 640 }, is_active: true },
  { registry_type: 'map', key: 'townmap', label: 'Town Map', metadata: { width: 1280, height: 960 }, is_active: true },
], { onConflict: 'registry_type,key' });
```

---

## Summary of Changes

| Type | What | Owner |
|------|------|-------|
| DB Migration | Create `game_registry` table with unique constraint and RLS | Studio (Lovable) |
| Data Seed | Insert current known maps, sprites, categories, skills | Studio (Lovable) |
| New Hook | `useGameRegistry(type)` React Query hook | Studio (Lovable) |
| UI Update | Replace hardcoded dropdowns in NPCFormModal with dynamic ones | Studio (Lovable) |
| Game Sync | Upsert maps/sprites/spawns on server boot | Game Server (Cursor) |

