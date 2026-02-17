

# Builder Event-Driven Model -- Studio Alignment Plan

## Summary

The game's in-game builder has shifted to an **event-driven model** where placeable entities are identified by event ids from a `BUILDER_EVENT_REGISTRY`. Studio's current `object_templates` rows and Map Browser UI need to be realigned so that what Studio shows matches what the game can actually resolve.

This is primarily a **data alignment + UI update** task, not a schema migration (the tables already exist).

---

## What's Changing

### Current State
- `object_templates` has 26 rows with ids like `ai-guide`, `container-chest`, `scripted-signpost`, `static-tree`, etc.
- The game's builder uses **event ids** like `guard`, `vendor`, `container`, `standalone-npc`, `trigger-zone`, etc.
- These two sets **do not overlap** -- Studio shows templates the game cannot resolve, and the game's valid event ids have no matching template rows.

### Target State
- `object_templates` rows match the 16 valid event ids from the game's `BUILDER_EVENT_REGISTRY`.
- Old rows that don't match any event id are disabled (`is_enabled = false`).
- Studio's Map Browser correctly interprets `template_id` on builder-placed entities as the event id.
- The `game-types.ts` type definitions are updated to include new columns (`type_id`, `behavior_config`, `is_interactive`, `interaction_radius`, `source`, `template_id`, `parent_entity_id`) that already exist in the DB but are missing from the TypeScript types.

---

## Implementation Steps

### Step 1: Update `object_templates` Data

Disable all 26 existing rows and upsert the 16 valid event-id rows. This is a data operation (not schema).

SQL to execute:
1. `UPDATE game.object_templates SET is_enabled = false WHERE id NOT IN ('test-npc', 'guard', 'artist', 'photographer', 'vendor', 'missionary', 'cat-dad', 'standalone-npc', 'hybrid-npc', 'ai-object', 'container', 'trigger-zone', 'static-decoration', 'point-marker', 'npc-api', 'object-api', 'custom-npc')`
2. Insert/upsert the 16+ rows from the handoff document's suggested SQL (section 2), adding `custom-npc` as well.

### Step 2: Update TypeScript Types (`game-types.ts`)

Add the columns that exist in the DB but are missing from the type definition:

For `map_entities`:
- Add `source`, `behavior_config`, `is_interactive`, `interaction_radius`, `template_id`, `parent_entity_id` columns.
- Rename `position_x`/`position_y` types to `number` (they're `real` in DB, which maps to `number`).

Add a new `object_templates` table type definition so Studio can query it with type safety.

### Step 3: Update Map Browser to Show Builder Event Info

In `MapEntityCard.tsx`:
- Display `template_id` (the event id) when present on builder-placed entities.
- Display `source` (builder vs tmx) as a visual indicator.
- Show `behavior_config` and `metadata` summary when available.

In `MapBrowser.tsx`:
- Add a filter for `source` (builder / tmx / all).
- Show `template_id` in entity cards for builder placements.

### Step 4: Add `object_templates` Query Support

Create a query hook or utility so that future Studio features (like a "Place Entity" UI) can fetch the valid template catalog from `game.object_templates` filtered by `is_enabled = true`.

### Step 5: Validate Graphic/Sprite Values

In `NPCFormModal.tsx`, the graphic dropdown currently shows `male` and `female`. The handoff confirms valid values are `female` and `hero`. Update the dropdown options to match:
- Change `male` to `hero` (or add `hero` and keep both if `male` is still valid).

---

## Technical Details

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/integrations/supabase/game-types.ts` | Add `object_templates` type, update `map_entities` with missing columns |
| `src/components/map-entities/MapEntityCard.tsx` | Show `source`, `template_id`, richer metadata display |
| `src/pages/MapBrowser.tsx` | Add source filter, pass new props to cards |
| `src/components/npcs/NPCFormModal.tsx` | Fix graphic dropdown (`hero` instead of `male`) |

### Data Operations (via Supabase)

1. Disable old `object_templates` rows not in the event registry
2. Upsert 16 new rows matching `BUILDER_EVENT_REGISTRY`

### No Schema Migrations Needed

All required columns (`source`, `behavior_config`, `template_id`, `is_interactive`, `interaction_radius`, `parent_entity_id`) already exist in the `game.map_entities` table. The `game.object_templates` table also already exists with the correct schema. This is purely a data + frontend alignment task.

### Cursor Response Summary

After implementation, share with the game team:
- `object_templates` rows now match event ids from `BUILDER_EVENT_REGISTRY`
- Old template ids disabled, not deleted (backward compat)
- Studio Map Browser shows `source` and `template_id` for builder placements
- Graphic dropdown updated to use valid sprite IDs (`female`, `hero`)
- TypeScript types updated to reflect full `map_entities` and `object_templates` schema
- Studio validates sprite values and template ids against the known registry

