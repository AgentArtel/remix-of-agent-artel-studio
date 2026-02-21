

# Studio Agents: Internal Agent Type + World Lore Workshop

## Concept

Add an `agent_type` column to `picoclaw_agents` to distinguish between **game agents** (NPCs that exist in the game world) and **studio agents** (internal tools like the Lorekeeper that persist across sessions and serve specific Studio functions). The Agent Builder will filter by type, and the World Lore page will always connect to the same Lorekeeper agent.

---

## Part 1: Agent Type Column

Add a new column `agent_type` to `picoclaw_agents`:

| Value | Meaning |
|-------|---------|
| `game` (default) | Agents that link to game entities / NPCs |
| `studio` | Internal Studio agents (Lorekeeper, future tooling agents) |

All existing agents default to `game`. The Agent Builder page will filter to show only `game` agents (no behavior change there).

---

## Part 2: Seed the Lorekeeper Agent

Insert a studio agent record into `picoclaw_agents` with:

- `picoclaw_agent_id`: `the-lorekeeper`
- `agent_type`: `studio`
- `llm_backend`: `google` / `llm_model`: `gemini-2.5-pro`
- `soul_md`: A system prompt focused on world-building, narrative synthesis, lore review, contradiction detection, and theme weaving
- `deployment_status`: `running` (always available)
- No `agent_config_id` (no game entity needed)

---

## Part 3: World Lore Table + Storage

**New table: `world_lore_entries`**

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid (PK) | Auto |
| title | text | Document title |
| entry_type | text | `document`, `image`, `note`, `concept` |
| content | text (nullable) | Inline or extracted text |
| storage_path | text (nullable) | Path in `world-lore` bucket |
| file_name | text (nullable) | Original filename |
| file_type | text (nullable) | MIME type |
| summary | text (nullable) | AI-generated summary |
| tags | jsonb | Categorization tags |
| metadata | jsonb | Extra data |
| created_at / updated_at | timestamptz | Timestamps |

**New storage bucket: `world-lore`** with public read access.

---

## Part 4: New Pages and Components

### WorldLore.tsx (new page)

Two-panel layout:
- **Left panel**: Upload area (drag-and-drop + click), scrollable list of lore entries as cards with title, type badge, summary preview, and delete
- **Right panel**: Chat with the Lorekeeper (reuses the chat pattern from `AgentChatTest` but calls `gemini-chat` directly with the Lorekeeper's system prompt and injects lore context)

### New Components

1. **`src/components/lore/LoreUploader.tsx`** - File upload to `world-lore` bucket, creates DB row, reads text content client-side for text files
2. **`src/components/lore/LoreEntryCard.tsx`** - Card for each lore entry with type icon, title, summary, delete button
3. **`src/components/lore/LorekeeperChat.tsx`** - Chat component that:
   - Fetches the Lorekeeper agent record from `picoclaw_agents` where `agent_type = 'studio'` and `picoclaw_agent_id = 'the-lorekeeper'`
   - Uses the agent's `soul_md` as the system prompt
   - Calls `gemini-chat` edge function
   - Has a "Review All Lore" button that fetches all `world_lore_entries` content/summaries and includes them as context

### New Hook

**`src/hooks/useWorldLore.ts`** - React Query hooks for:
- Fetching all lore entries
- Creating entries (with file upload)
- Deleting entries (removes storage file + DB row)

---

## Part 5: Routing and Sidebar

- Add `'world-lore'` to the `Page` type union in `App.tsx`
- Add `WorldLore` component to the page switch
- Add sidebar entry under "Live" group: `{ id: 'world-lore', label: 'World Lore', icon: BookOpen }`

---

## Part 6: Agent Builder Filter

Update the `usePicoClawAgents` query (or the `AgentBuilder` page) to filter by `agent_type = 'game'` so studio agents don't appear in the game agent grid.

---

## Summary of Changes

| Type | What |
|------|------|
| DB Migration | Add `agent_type` column to `picoclaw_agents` (default `'game'`) |
| DB Migration | Create `world_lore_entries` table |
| Storage | Create `world-lore` bucket |
| Data Insert | Seed the Lorekeeper studio agent |
| New Hook | `useWorldLore.ts` |
| New Components | `LoreUploader`, `LoreEntryCard`, `LorekeeperChat` |
| New Page | `WorldLore.tsx` |
| Updated | `Sidebar.tsx` - add World Lore nav item |
| Updated | `App.tsx` - add route |
| Updated | `AgentBuilder.tsx` - filter to `agent_type = 'game'` only |

