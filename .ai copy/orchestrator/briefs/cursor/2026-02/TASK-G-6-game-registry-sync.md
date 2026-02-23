# TASK: Game Registry Sync — Cursor Agent Handoff

**Created:** 2026-02-21
**Owner:** Game Server (Cursor Agent)
**Depends on:** Studio migration that created `public.game_registry` table

---

## Context

The Studio NPC Builder now reads dropdown options (maps, sprites, spawn points, categories, skills) from a **`game_registry`** table in Supabase instead of hardcoded values. The game server needs to populate this table on startup so the Studio always reflects what actually exists in the game.

## Table Schema

```sql
CREATE TABLE public.game_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  registry_type text NOT NULL,        -- 'map' | 'sprite' | 'spawn_point' | 'category' | 'skill'
  key text NOT NULL,                   -- unique identifier (e.g. 'simplemap')
  label text NOT NULL,                 -- display name (e.g. 'Simple Map')
  metadata jsonb DEFAULT '{}',         -- extra info (dimensions, coords, etc.)
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (registry_type, key)
);
```

## What to Sync

| registry_type | Source in Game | key example | metadata example |
|---------------|---------------|-------------|-----------------|
| `map` | RPG-JS map loader / map list | `simplemap` | `{"width": 640, "height": 640, "tileWidth": 16, "tileHeight": 16}` |
| `sprite` | Spritesheet registry | `female` | `{"spritesheet": "female", "frameWidth": 32, "frameHeight": 32}` |
| `spawn_point` | Map object layer (named spawn objects) | `simplemap-center` | `{"mapId": "simplemap", "x": 320, "y": 320, "label": "Center"}` |
| `category` | Static config | `npc` | `{"label": "NPC", "description": "Standard NPC"}` |
| `skill` | Game skill/action registry | `move` | `{"description": "Move to a position", "params": ["x", "y"]}` |

## Implementation

### On Server Startup

After the game server initializes and loads maps/spritesheets, upsert all known assets:

```typescript
import { supabase } from './supabaseClient'; // existing client

async function syncGameRegistry() {
  const entries = [];

  // 1. Maps — iterate your map registry
  for (const [mapId, mapData] of Object.entries(loadedMaps)) {
    entries.push({
      registry_type: 'map',
      key: mapId,
      label: mapData.displayName || mapId,
      metadata: {
        width: mapData.width,
        height: mapData.height,
        tileWidth: mapData.tileWidth,
        tileHeight: mapData.tileHeight,
      },
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }

  // 2. Sprites — iterate your spritesheet registry
  for (const [spriteId, spriteData] of Object.entries(spriteRegistry)) {
    entries.push({
      registry_type: 'sprite',
      key: spriteId,
      label: spriteData.displayName || spriteId,
      metadata: {
        spritesheet: spriteData.id,
        frameWidth: spriteData.frameWidth,
        frameHeight: spriteData.frameHeight,
      },
      is_active: true,
      updated_at: new Date().toISOString(),
    });
  }

  // 3. Spawn points — from map object layers
  for (const [mapId, mapData] of Object.entries(loadedMaps)) {
    const spawnObjects = mapData.objects?.filter(obj => obj.type === 'spawn') || [];
    for (const sp of spawnObjects) {
      entries.push({
        registry_type: 'spawn_point',
        key: `${mapId}-${sp.name}`,
        label: sp.name || `Spawn at (${sp.x}, ${sp.y})`,
        metadata: { mapId, x: sp.x, y: sp.y },
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // 4. Upsert all at once
  const { error } = await supabase
    .from('game_registry')
    .upsert(entries, { onConflict: 'registry_type,key' });

  if (error) {
    console.error('[game-registry] Sync failed:', error.message);
  } else {
    console.log(`[game-registry] Synced ${entries.length} entries`);
  }
}
```

### Optional: Re-sync on Hot Reload

If the game supports hot-reloading maps, call `syncGameRegistry()` again after reload.

### Deactivating Removed Assets

If a map/sprite is removed, set `is_active = false` instead of deleting, so the Studio can show a warning for NPCs still referencing it:

```typescript
// After building the entries list, mark anything not in the list as inactive
await supabase
  .from('game_registry')
  .update({ is_active: false, updated_at: new Date().toISOString() })
  .eq('registry_type', 'map')
  .not('key', 'in', `(${mapKeys.join(',')})`);
```

## Supabase Connection

Use the existing Supabase client already configured in the game server. Same project (`ktxdbeamrxhjtdattwts`), public schema.

## Acceptance Criteria

- [ ] On game server startup, all available maps are upserted to `game_registry` with `registry_type = 'map'`
- [ ] All available spritesheets are upserted with `registry_type = 'sprite'`
- [ ] Named spawn points from map object layers are upserted with `registry_type = 'spawn_point'`
- [ ] The Studio NPC Builder dropdowns reflect actual game data after sync
- [ ] Removed assets are marked `is_active = false` (not deleted)
