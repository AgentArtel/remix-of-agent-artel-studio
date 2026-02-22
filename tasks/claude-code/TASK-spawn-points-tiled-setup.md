# TASK: Spawn Points — Tiled Map Setup & Game Server Verification

**Created:** 2026-02-21
**Owner:** Human (Tiled editor) + Game Dev Agent (verification)
**Status:** Ready for implementation

---

## Context

The Studio NPC Builder and Agent Builder both have a **spawn point preset picker** — a dropdown that lets users select a named location on a map when creating/placing NPCs. This data comes from the `game_registry` table (type `spawn_point`), which is populated by `gameRegistrySync.ts` on game server startup.

### What's Already Built

| Component | File | Status |
|-----------|------|--------|
| **Game Registry table** | `supabase/migrations/20260221023933_*.sql` | Done |
| **Registry sync service** | `my-rpg-game/main/services/gameRegistrySync.ts` | Done |
| **Server wiring** | `my-rpg-game/main/server.ts` (setTimeout block) | Done |
| **Studio hook** | `studio/src/hooks/useGameRegistry.ts` | Done |
| **NPC Builder dropdowns** | `studio/src/components/npcs/NPCFormModal.tsx` | Done |
| **Agent Builder dropdowns** | `studio/src/components/agents/AgentFormModal.tsx` | Done |
| **TMX parser** | `parseSpawnPoints()` in `gameRegistrySync.ts` | Done |

### The Missing Piece

The TMX parser already works — it reads objects with `type="start"` or `type="spawn"` from any object layer and syncs them to `game_registry`. But **only 2 of 8 maps have spawn objects**:

- `simplemap.tmx` — 1 object (`start`, type="start")
- `voidMap.tmx` — 2 objects (`start` type="start", `spawn_void_start_01` type="spawn")

The other 6 maps have no spawn-type objects at all. The user needs to add a dedicated `spawn_points` object layer to each map in Tiled.

---

## Part 1: Human Task — Add Spawn Points in Tiled

### Instructions for the Human User

For each map file in `my-rpg-game/main/worlds/maps/`, open it in Tiled and:

1. **Add a new Object Layer** — In the Layers panel, click **New Layer → Object Layer**. Name it exactly: `spawn_points`
2. **Add point objects** — Select the **Insert Point** tool (shortcut: **I**). Click on the map to place spawn points at meaningful locations.
3. **Set object properties** — For each point object:
   - **Name**: A descriptive label (e.g. `fountain`, `market_stall`, `gate`). This becomes the display name in Studio.
   - **Type**: Set to `spawn` (this is what the parser matches on)
4. **Save** the `.tmx` file

### Important Notes

- **Keep existing objects** — Do NOT delete or move existing objects on other layers. The `start` objects are used by RPGJS for player spawning.
- **Use the Point tool, not Rectangle** — The parser reads `x` and `y` from the object tag. Point objects give exact coordinates; rectangles give top-left corner.
- **Names must be unique within a map** — The registry key is `{mapId}-{name}`, so each spawn point name must be unique per map.
- **Type must be exactly `spawn`** — Case-sensitive. Not "Spawn", not "npc_spawn", just `spawn`.

### Suggested Spawn Points Per Map

Below are recommended spawn points based on each map's layout, existing objects, and pixel dimensions. Place points where it makes thematic sense for NPCs to appear.

#### simplemap.tmx (800x640 pixels, 25x20 tiles @ 32px)

Existing objects: `start` (200, 350), `EV-1` (98, 542), `EV-7` (318, 443), zones, mailbox, desk

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `center` | ~400 | ~320 | Center of map |
| `north_clearing` | ~400 | ~100 | Open area in the north |
| `south_path` | ~300 | ~540 | Near existing EV-1 area |
| `east_entrance` | ~700 | ~350 | Eastern edge of map |

#### simplemap2.tmx (640x640 pixels, 20x20 tiles @ 32px)

Existing objects: Two zone objects (houses)

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `start` | ~320 | ~320 | Center, general entry point |
| `near_house_north` | ~350 | ~100 | Near simple_house_03 |
| `near_house_south` | ~100 | ~320 | Near simple_house_04 |

#### simplemap3.tmx (480x640 pixels, 15x20 tiles @ 32px)

No existing objects or object layers.

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `start` | ~240 | ~320 | Center of map |
| `north` | ~240 | ~80 | Northern area |

**Note:** simplemap3 is not in `myworld.world` — it may be orphaned. Add basic spawn points just in case, but verify it's actually loaded by the game server.

#### village_square.tmx (640x640 pixels, 20x20 tiles @ 32px)

Existing objects: `EV-25` (chest), two zone objects (houses)

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `start` | ~320 | ~500 | Southern entry |
| `fountain` | ~320 | ~320 | Village center (if there's a fountain/well) |
| `market_stall` | ~500 | ~300 | Near the east side |
| `tavern_entrance` | ~130 | ~100 | Near simple_house_05 zone |

#### loomVillageMap.tmx (800x640 pixels, 25x20 tiles @ 32px)

Existing objects: `EV-TOWN-BOARD` (380, 448)

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `start` | ~400 | ~500 | Southern entry |
| `village_center` | ~400 | ~320 | Center of map |
| `town_board` | ~350 | ~420 | Near the town board event |
| `elder_house` | ~600 | ~200 | NE area — place for an elder NPC |

#### hometown.tmx (800x640 pixels, 25x20 tiles @ 32px)

Existing objects: `EV-WISHING-WELL` (351, 303), `EV-CAVE-ENTRANCE` (79, 132)

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `start` | ~400 | ~500 | Southern entry |
| `town_square` | ~400 | ~300 | Center near wishing well |
| `cave_entrance` | ~100 | ~150 | Near cave event |
| `gate` | ~700 | ~320 | Eastern exit |

#### childhoodhome.tmx (800x640 pixels, 25x20 tiles @ 32px)

No existing objects (object layer exists but is empty).

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `start` | ~400 | ~400 | Main entry |
| `bedroom` | ~600 | ~200 | Interior location |
| `kitchen` | ~200 | ~200 | Interior location |

#### voidMap.tmx (480x480 pixels, 15x15 tiles @ 32px)

Existing objects on "Events" layer: `start` (239, 414), `spawn_void_start_01` (269, 457), zones, teleports, interactive objects, signage.

**Copy the spawn-relevant ones to the new `spawn_points` layer:**

| Spawn Name | Suggested X | Suggested Y | Notes |
|------------|-------------|-------------|-------|
| `void_start` | ~239 | ~414 | Near existing start object |
| `altar` | ~160 | ~120 | Near void altar zone |
| `platform` | ~160 | ~400 | Near void platform zone |

---

## Part 2: Game Dev Agent — Verification Steps

After the user has added spawn points in Tiled, verify the end-to-end flow:

### Step 1: Verify TMX Files Parse Correctly

Check that each modified `.tmx` file has the expected XML structure:

```xml
<objectgroup id="..." name="spawn_points">
  <object name="fountain" type="spawn" x="320" y="480">
    <point/>
  </object>
  <object name="market_stall" type="spawn" x="500" y="300">
    <point/>
  </object>
</objectgroup>
```

Key checks:
- Object layer name is `spawn_points`
- Each object has `type="spawn"` (lowercase, exact match)
- Each object has a `name` attribute
- Each object has `x` and `y` attributes
- Objects use `<point/>` child element (not rectangle)

### Step 2: Verify Parser in gameRegistrySync.ts

The parser at `my-rpg-game/main/services/gameRegistrySync.ts` line 69-96 uses this regex to match objects:

```typescript
if (!/type="(start|spawn)"/.test(tag)) continue
```

This matches both `type="start"` (RPGJS player spawns) and `type="spawn"` (NPC placement presets). Both types will be synced to `game_registry` as `spawn_point` entries.

The registry key format is: `{mapId}-{objectName}` (e.g. `village_square-fountain`).

### Step 3: Start Game Server and Check Logs

Start the game server and look for the registry sync log message:

```
[GameRegistry] Synced XX entries (Y maps, Z spawn points)
```

The spawn point count should match the total number of `type="start"` + `type="spawn"` objects across all maps. Based on the suggested spawn points above, expect approximately 25-30 spawn points total.

### Step 4: Verify Supabase Data

Query the `game_registry` table to confirm spawn points were synced:

```sql
SELECT key, label, metadata
FROM game_registry
WHERE registry_type = 'spawn_point'
ORDER BY key;
```

Each row should have:
- `key`: `{mapId}-{name}` (e.g. `village_square-fountain`)
- `label`: The object name or formatted label
- `metadata`: `{ "mapId": "village_square", "x": 320, "y": 480 }`

### Step 5: Verify Studio Dropdowns

1. Open Studio → **NPC Manager** → Create/Edit NPC
2. Select a map from the map dropdown
3. The **Spawn Point Preset** picker should show all spawn points for that map
4. Selecting a preset should auto-fill the X and Y coordinates

5. Open Studio → **Agent Builder** → Edit agent → **Game Link** tab
6. The map dropdown should show available maps
7. (If spawn point picker is wired up) Should show presets for selected map

### Step 6: Test NPC Spawning

1. In Studio, create an NPC with a spawn point from the preset picker
2. The NPC should appear in-game at exactly those coordinates
3. Verify the NPC is at the expected location on the map

---

## Architecture Reference

```
Tiled (.tmx files)
    |
    | parseSpawnPoints() reads type="start" and type="spawn" objects
    v
gameRegistrySync.ts (game server boot)
    |
    | upserts to game_registry table
    v
Supabase: game_registry (registry_type='spawn_point')
    |
    | useGameRegistry('spawn_point') hook
    v
Studio UI: NPCFormModal + AgentFormModal (spawn point preset pickers)
    |
    | saves to agent_configs (spawn_x, spawn_y, spawn_map)
    v
Game Server: npcSpawner.ts (real-time sync, spawns NPC at coordinates)
```

---

## Files Reference

| File | Repo | Purpose |
|------|------|---------|
| `my-rpg-game/main/worlds/maps/*.tmx` | Game | Tiled map files (user edits these) |
| `my-rpg-game/main/services/gameRegistrySync.ts` | Game | Parses TMX + syncs to DB |
| `my-rpg-game/main/server.ts` | Game | Calls syncGameRegistry on boot |
| `studio/src/hooks/useGameRegistry.ts` | Studio | React Query hook for registry data |
| `studio/src/components/npcs/NPCFormModal.tsx` | Studio | NPC form with spawn point picker |
| `studio/src/components/agents/AgentFormModal.tsx` | Studio | Agent form with game link tab |
