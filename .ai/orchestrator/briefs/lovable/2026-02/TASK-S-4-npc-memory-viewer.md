# TASK-S-4: NPC Memory Viewer

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Agent-Artel-studio (Studio)
**Agent:** Lovable
**Status:** TODO — unblocked (S-1 NPC Builder is merged)
**Depends on:** S-1 (merged)
**Blocks:** Nothing

---

## Goal

Add a Memory tab to the NPC detail view so you can browse an NPC's conversation history from `game.agent_memory`. This is the debugging and monitoring surface — see exactly what the NPC said, what the player said, what tool calls happened, and when.

## Context

The NPC Builder (S-1) is merged with full CRUD. The current flow is: click an NPC card → modal opens with the edit form. This task adds a tab system to that modal so you can switch between "Configuration" (the existing form) and "Memory" (conversation history).

The `game.agent_memory` table stores every message in every NPC conversation. Studio has SELECT access. The game server writes these rows; Studio only reads them.

### agent_memory schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `agent_id` | text | NPC ID (matches `agent_configs.id`) |
| `role` | text | `user`, `assistant`, `system`, or `tool` |
| `content` | text | Message body |
| `importance` | number | Relevance weight (0-1) |
| `metadata` | jsonb | Tool calls, function results, context |
| `created_at` | timestamptz | When the message was stored |

---

## Deliverables

### 1. Tab system in NPCFormModal

Convert the existing modal into a tabbed layout:

- **Tab 1: "Configuration"** — the existing form (all current fields, unchanged)
- **Tab 2: "Memory"** — conversation history viewer (new)

Use a simple tab bar at the top of the modal content area. Default to "Configuration" when creating a new NPC. Default to "Configuration" when editing, but allow switching to "Memory."

When creating a new NPC (no `initialData`), hide the Memory tab entirely — there's no `agent_id` to query yet.

### 2. MemoryViewer component

Create `src/components/npcs/MemoryViewer.tsx`:

**Props:**
```typescript
interface MemoryViewerProps {
  agentId: string;  // NPC ID to fetch memory for
}
```

**Query:**
```typescript
const { data: messages, isLoading } = useQuery({
  queryKey: ['game-agent-memory', agentId],
  queryFn: async () => {
    const { data, error } = await gameDb()
      .from('agent_memory')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) throw error;
    return data;
  },
  enabled: !!agentId,
});
```

**Display — chat-style message list:**

Each message rendered as a chat bubble:

| Role | Alignment | Color | Label |
|------|-----------|-------|-------|
| `user` | Right | Blue-ish (`bg-blue-500/20 text-blue-300`) | "Player" |
| `assistant` | Left | Green-ish (`bg-green/20 text-green`) | NPC name |
| `system` | Center | Gray (`bg-white/5 text-white/40`) | "System" |
| `tool` | Left | Amber (`bg-amber-500/20 text-amber-300`) | "Tool Call" |

Each bubble shows:
- Role label (small, above the content)
- Message content (the `content` field)
- Timestamp (small, below the content — relative like "2m ago" or absolute for older)
- If `metadata` is non-null and non-empty, show a collapsible "Details" section with the JSON pretty-printed (for debugging tool calls)

**Layout:**
- Scrollable container (max-height matches the form area, roughly `max-h-[70vh]`)
- Messages in chronological order (oldest at top, newest at bottom)
- Auto-scroll to bottom on initial load
- Sticky count badge at the top: "42 messages" (from query result length)

### 3. Empty state

If the NPC has no messages yet:
- Show an empty state: message icon + "No conversations yet" + "This NPC hasn't talked to any players."

### 4. Loading state

While the query is in flight:
- Show 3-4 skeleton chat bubbles (alternating left/right alignment)

### 5. Refresh button

A small refresh button in the Memory tab header that calls `queryClient.invalidateQueries(['game-agent-memory', agentId])`. Useful when the game is running and you want to see new messages.

---

## Acceptance Criteria

- [ ] NPCFormModal has two tabs: "Configuration" and "Memory"
- [ ] "Configuration" tab shows the existing form — no regressions
- [ ] "Memory" tab shows a chat-style message list from `game.agent_memory`
- [ ] Messages filtered by the current NPC's `agent_id`
- [ ] Messages displayed in chronological order (oldest first)
- [ ] Role-based styling: user (right, blue), assistant (left, green), system (center, gray), tool (left, amber)
- [ ] Each message shows role label, content, and timestamp
- [ ] Metadata JSON is viewable (collapsed by default) for tool/system messages
- [ ] Empty state when NPC has no messages
- [ ] Loading skeleton while fetching
- [ ] Refresh button re-fetches messages
- [ ] Memory tab hidden when creating a new NPC (no agent_id yet)
- [ ] All queries use `gameDb()` — zero queries without `.schema('game')`
- [ ] Memory is READ ONLY — no insert/update/delete on `agent_memory` from Studio

## Do

- Use `gameDb()` from `src/lib/gameSchema.ts` for all queries.
- Create `MemoryViewer` as a standalone component in `src/components/npcs/`.
- Use React Query with `enabled: !!agentId` so it doesn't fire for new NPCs.
- Match the dark theme styling of the existing modal.
- Keep the tab bar simple — two text tabs with an underline indicator.

## Don't

- Don't modify the existing form fields or CRUD logic — the Configuration tab should be identical to the current modal.
- Don't add write operations on `agent_memory` — Studio is read-only for this table.
- Don't add real-time subscriptions yet — a manual refresh button is sufficient. Real-time can come later.
- Don't paginate (limit 100 is fine for now) — infinite scroll can come later.
- Don't query game tables without `.schema('game')`.

## Reference

- Memory Viewer spec: `docs/game-integration/TASK-game-schema-integration.md` (lines ~118-133, "Optional enhancement")
- Architecture: `docs/game-integration/VISION-studio-game-architecture.md` (Memory Viewer section)
- Current NPC modal: `src/components/npcs/NPCFormModal.tsx`
- Schema: `src/integrations/supabase/types.ts` (`agent_memory` table definition)
- Game schema helper: `src/lib/gameSchema.ts`
