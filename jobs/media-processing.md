# Job: Media Processing

> **Status:** Draft  
> **Started:** 2026-02-24

---

## 1. The job (what I want done)

When media files are uploaded to Studio (lore), they are stored and tracked as unprocessed. In the game, the player can take a **task** from a **task board**: receive a reference (fragment = file ID) to one unprocessed row, take it to a **processor** (object or NPC) that converts that file to markdown and updates the row, then return to the task board to turn in the task. The board verifies the row was processed and rewards the player with gold.

**Who:** Player. **Where:** Task board (object), processor (object or NPC). **Backend:** Storage, unprocessed-media table, processor service (e.g. extract-to-markdown), task board logic (assign task, verify, reward).

---

## 2. Map (steps and flow)

1. **Studio:** Upload media to lore → file saved to storage, row created in **unprocessed media** table with `file_id` (and any other metadata).
2. **Game — Task board (start):** Player interacts → "Start new task?" (Yes / No). If Yes → player is assigned a **fragment** (item or token that carries `file_id` linked to one unprocessed row). Fragment = the task brief + file ID.
3. **Game — Processor:** Player goes to processor (object or NPC), gives or submits the fragment (file ID). Processor takes `file_id`, loads the file from storage/table, runs **media → markdown** (e.g. existing extract-lore-text or similar), updates that row with markdown text and marks it processed. Processor updates the player's item to "complete" (or gives back a completed token).
4. **Game — Task board (end):** Player returns to task board, ends turn, returns the item. Task board checks the table: does this `file_id` now have markdown / processed? If yes → reward player with gold. If no → no reward (or message "not done yet").

**Flow in short:**  
Upload (Studio) → Unprocessed table + storage  
→ Task board: assign task (fragment = file_id)  
→ Player takes fragment to processor  
→ Processor: file_id → markdown, update row, mark item complete  
→ Player returns to task board, turns in item  
→ Task board: verify row processed → reward gold

---

## 3. What we need to build

- [ ] **Unprocessed media table** — Or clarify existing: do we use `world_lore_entries` with a "processed" / "has_markdown" flag, or a dedicated `unprocessed_media` (or `media_files`) table with `file_id`, storage path, status, markdown content when done? Need a single source of truth for "this file_id is unprocessed" and "this file_id now has markdown."
- [ ] **Task board (object)** — New object type + placement on map. Two interactions (or one menu): (1) Start task → pick an unprocessed row, give player a fragment (item with file_id). (2) End turn / return item → receive item, look up file_id, check table for processed; if processed, reward gold and clear/consume item. Requires game to give item and gold (Game Control API or current workaround).
- [ ] **Fragment (item)** — In-game item that carries `file_id` (and optionally task brief). Game needs to pass this to processor and task board; processor and board need to read file_id (from item metadata or player state).
- [ ] **Processor (object or NPC)** — Accepts file_id (from fragment). Calls backend (e.g. Edge Function) that: fetches file by file_id, runs media→markdown (extract-lore-text or E2M etc.), writes markdown to the row, marks row processed. Returns "complete" so the game can update the fragment/item to complete state. May be one object (e.g. "markdown-processor") or an NPC with a tool.
- [ ] **Backend: assign task** — Task board needs an action (e.g. `task_board.assign_task`) that: queries unprocessed rows, picks one, returns file_id (and maybe task brief text) so the game can create/give the fragment. Could be object-action (n8n) or a dedicated Edge Function.
- [ ] **Backend: process file** — Processor calls an Edge Function (or reuses extract-lore-text) with file_id; EF updates the row with markdown and processed flag.
- [ ] **Backend: verify and reward** — Task board "end turn" action: input file_id (from returned item). Check table for that file_id → processed? If yes, return success + reward (e.g. gold amount). Game gives gold to player (needs Game Control or equivalent).
- [ ] **Game: give item, give gold** — Today the game has no HTTP API for "give this player this item" or "add gold." Either implement the Game Control API (see GAME_CONTROL_AND_PICOCLAW_HANDOFF) or a minimal endpoint for "reward player" used by the task board response.

---

## 4. Vision (how it should feel / work)

- **Familiar:** Task board = pick up work; fragment = the job ticket (file ID); processor = do the work; return = turn in and get paid. No fantasy jargon in the jobs folder or backend naming.
- **Clear state:** Unprocessed vs processed is explicit in the table so the task board and processor always know what's done.
- **One file per task:** One fragment = one file_id. Player completes one media file per round trip. Repeat for more files.

---

## 5. Notes / open questions

- Naming: "fragment" in-game is fine; in code/docs we can use `file_id`, `task_item`, or `fragment` consistently.
- Processor: object vs NPC — object is simpler (one interaction, pass file_id); NPC allows dialogue. Either works; decide based on preference.
- Existing `world_lore_entries` + `extract-lore-text`: can we use them as the unprocessed table + processor backend, with a `processed_at` or `content` (markdown) column to mean "done"?
