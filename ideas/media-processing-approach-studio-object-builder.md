# Media Processing — Approach: Use Studio Object Builder + Generic Game Handler

> **Status:** Approach agreed. Ready for implementation.
> **Created:** 2026-02-24
> **Context:** We want the Media Processing job (task board → assign task → processor → turn in → reward) without overbuilding. We already have an object/action builder in Studio and map placement; the game currently ignores it and hardcodes behavior. This doc captures the change in direction and what we're doing.

---

## 1. The idea

**Media Processing job:** Player takes a task from a task board (gets a file_id), takes it to a media processor (object) that converts the file to markdown and updates the row, then returns to the task board to turn in and get gold.

**Change in approach:** Use the **existing Studio Object Builder** (object templates + actions JSON + object instances with map + position) as the single place to define new object types and their actions. We do **not** add new hardcoded branches in the game for task-board or media-processor. Instead we:

1. **Define objects and actions in Studio** — Create templates `task-board` and `media-processor` with the right action keys (e.g. `assign_task`, `turn_in_task`, `process`).
2. **Place them on the map** — Use existing Object Instances (template + map_id + position). No new placement UI.
3. **Link actions to backend** — Register Edge Function URLs in the action registry so `object_type.action` (e.g. `task_board.assign_task`) routes to the right Edge Function.
4. **Make the game generic** — Have the game load `template.actions` from the DB and, for any object that has actions, show a menu and call object-action with that object_type and action. Apply response (inventory_delta, message, reward_gold) the same way mailbox/desk already do.

Result: New jobs (like Media Processing) are added by creating templates + actions in Studio, placing instances, and adding Edge Functions + registry entries. No new game code per object type.

---

## 2. Why this direction

- **Reuse what exists:** Studio already has object_templates (with `actions` JSONB), object_instances (template_id, map_id, position), and object-action that routes by action_key to a URL.
- **Single source of truth:** Object types and their actions live in Studio; the game just "does what the template says."
- **Scalable:** Next job = new template + actions + placement + Edge Functions + registry. No more hardcoded `if (templateId === 'desk')` in the game.
- **Clear split:** Lovable/Studio/Supabase own: Edge Functions, registry, object_templates data, placement. Game owns: generic "interact → menu from actions → call object-action → apply response."

---

## 3. What's already there

| Piece | Where | Notes |
|-------|--------|--------|
| **Object templates with actions** | `object_templates.actions` (JSONB) | Studio UI: create template, define actions (key, description, inputs, outputs). Game currently does **not** load or use this. |
| **Object instances (placement)** | `object_instances` (template_id, map_id, position) | Studio: place any template on a map. Game loads these and spawns events. |
| **object-action** | `studio/supabase/functions/object-action` | Receives object_type, action, player_id, inputs; looks up `action_key = object_type.action` in registry; forwards to URL; returns JSON. |
| **Action registry** | `n8n_webhook_registry` (or equivalent) | action_key → webhook_url. Can point to Edge Function invoke URLs, not only n8n. |
| **Lore / media pipeline** | `world_lore_entries`, `extract-lore-text` | Unprocessed = content IS NULL. Processor = call extract-lore-text (needs "entryId only" + fetch from storage). |
| **Item delta + gold** | objectSpawner (mailbox/desk) | Game already applies inventory_delta (add/remove items) and can apply reward_gold in handler. |

---

## 4. What we need to do

### 4.1 Game (our side)

- **Load `actions` when loading objects** — In `objectSpawner`, extend the query to select `template.actions` (or ensure template includes actions). When building the dynamic event class, if the template has `actions`, use a **generic handler**: show choices built from `Object.entries(template.actions)` (e.g. "Assign task", "Turn in task"), then call object-action with `object_type: template.id`, `action: chosenKey`, `player_id`, and any `inputs` (e.g. from player variable for `entry_id`). Apply response: inventory_delta (add/remove items), message, reward_gold (e.g. `player.gold += result.reward_gold`). Optionally keep a small fallback for legacy objects (desk, mailbox, butler, archivist) that stay hardcoded until we migrate them.
- **Task fragment item + player variable** — Add a `TaskFragmentItem` (or similar) and map it in ITEM_CLASS_MAP. When the game receives `inventory_delta.add` for task-fragment and the response includes `entry_id`, set `player.setVariable('active_task_file_id', entry_id)`. When sending inputs to turn_in or process, include `entry_id: player.getVariable('active_task_file_id')`.
- **No new hardcoded branches** for task-board or media-processor; they work because they have templates with actions and registry entries.

### 4.2 Studio / Supabase (Lovable or us)

- **Edge Functions** — Three: (1) task-board-assign: pick unprocessed row from world_lore_entries, return entry_id + inventory_delta.add task-fragment. (2) task-board-turn-in: verify row has content, return reward_gold + inventory_delta.remove. (3) media-processor-process: take entry_id, call extract-lore-text (or inline), update row. Contract: same request/response shape as object-action expects (success, message, inventory_delta, reward_gold, entry_id where needed).
- **extract-lore-text** — Support "entryId only": load row, fetch file from storage by storage_path, extract, update content.
- **Registry** — Insert rows so `task_board.assign_task`, `task_board.turn_in_task`, `media-processor.process` point to the three Edge Function invoke URLs.
- **Object templates (data)** — Ensure templates `task-board` and `media-processor` exist with the right actions (can be done in Studio UI or seed/migration). Task-board: actions `assign_task`, `turn_in_task`. Media-processor: action `process`.
- **Object instances** — Place one task-board and one media-processor on the desired map (Studio UI).

---

## 5. Flow (after)

1. Designer creates in Studio: template `task-board` with actions `assign_task`, `turn_in_task`; template `media-processor` with action `process`. Places instances on map.
2. Registry has three entries: task_board.assign_task → task-board-assign EF, task_board.turn_in_task → task-board-turn-in EF, media-processor.process → media-processor-process EF.
3. Player interacts with task board. Game loads template.actions, shows "Assign task" / "Turn in task". Player picks "Assign task". Game calls object-action(task_board, assign_task, player_id, {}). EF returns entry_id + inventory_delta.add task-fragment. Game adds item and sets active_task_file_id.
4. Player goes to media-processor. Game shows "Process". Player picks it. Game calls object-action(media-processor, process, player_id, { entry_id }). EF calls extract-lore-text, updates row. Game shows message.
5. Player returns to task board, picks "Turn in task". Game calls object-action(task_board, turn_in_task, player_id, { entry_id }). EF verifies content, returns reward_gold + inventory_delta.remove. Game adds gold, removes fragment, clears variable.

---

## 6. What stays the same

- object-action Edge Function behavior (lookup by action_key, POST to URL, return response).
- Studio Object Templates and Object Instances UI and schema.
- world_lore_entries as the source of truth for unprocessed/processed (content IS NULL vs not).
- Existing mailbox/desk/butler/archivist can remain hardcoded until we optionally migrate them to the generic handler.

---

## 7. References

- **Job spec:** `jobs/media-processing.md`
- **Game objectSpawner:** `my-rpg-game/main/services/objectSpawner.ts` (today loads only template id, name, is_enabled; hardcodes behavior by templateId).
- **Studio object templates:** `studio/src/pages/ObjectTemplates.tsx`, `studio/src/hooks/useObjectTemplates.ts` (actions: Record<string, { description, inputs, outputs, credentials? }).
- **object-action:** `studio/supabase/functions/object-action/index.ts` (action_key = object_type.action, forwards to webhook_url).
