

# Persist Chat and Knowledge Graph

## Problem 1: Chat Vanishes on Tab Switch

The current tab implementation conditionally renders either `LorekeeperChat` or `LoreNeuralNetwork`. Switching tabs unmounts the chat component entirely, destroying its message state.

**Fix:** Render both components always, but hide the inactive one with CSS (`display: none`). This keeps `LorekeeperChat` mounted and preserves its messages, scroll position, and loading state across tab switches.

## Problem 2: Knowledge Graph Lost on Refresh

The knowledge graph only lives in React state. Refreshing the page or navigating away loses it.

**Fix:** Persist the graph as a special `world_lore_entries` row with `entry_type = 'knowledge_graph'`. On page load, check for this row and restore the graph. When "Map World" generates a new graph, upsert this row.

---

## Changes

### 1. `src/pages/WorldLore.tsx`

- Change the tab content from conditional rendering to **both always rendered**, with the inactive one wrapped in a `div` with `display: none`
- On mount, query `world_lore_entries` for a row where `entry_type = 'knowledge_graph'` and restore its `metadata.graph` into state
- Update `handleKnowledgeUpdate` to also persist the graph to that row (upsert)

### 2. `src/components/lore/LorekeeperChat.tsx`

No changes needed -- it already loads history from `agent_memory` on mount and persists new messages via `saveMemory`. Since it will no longer unmount on tab switch, chat history will stay visible.

---

## Technical Details

### Always-render both tabs (WorldLore.tsx)

Replace:
```tsx
{activeTab === 'chat' ? (
  <LorekeeperChat ... />
) : (
  <LoreNeuralNetwork ... />
)}
```

With:
```tsx
<div className={activeTab !== 'chat' ? 'hidden' : 'flex-1 flex flex-col'}>
  <LorekeeperChat ... />
</div>
<div className={activeTab !== 'neural' ? 'hidden' : 'flex-1 flex flex-col'}>
  <LoreNeuralNetwork ... />
</div>
```

### Persist knowledge graph

On mount, load saved graph:
```tsx
useEffect(() => {
  supabase
    .from('world_lore_entries')
    .select('metadata')
    .eq('entry_type', 'knowledge_graph')
    .single()
    .then(({ data }) => {
      if (data?.metadata?.graph) setKnowledgeGraph(data.metadata.graph);
    });
}, []);
```

On graph update, upsert a row:
```tsx
const handleKnowledgeUpdate = async (graph) => {
  setKnowledgeGraph(graph);
  setActiveTab('neural');

  // Upsert the knowledge_graph row
  const { data: existing } = await supabase
    .from('world_lore_entries')
    .select('id')
    .eq('entry_type', 'knowledge_graph')
    .single();

  if (existing) {
    await supabase.from('world_lore_entries')
      .update({ metadata: { graph }, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('world_lore_entries')
      .insert({ title: 'Knowledge Graph', entry_type: 'knowledge_graph', metadata: { graph } });
  }
};
```

### Filter out the knowledge_graph row from the lore list

Update `useWorldLoreEntries` in `src/hooks/useWorldLore.ts` to exclude the special row so it doesn't appear as a lore entry card:

```tsx
.select('*')
.neq('entry_type', 'knowledge_graph')  // add this filter
.order('created_at', { ascending: false });
```

---

## Files

| File | Change |
|------|--------|
| `src/pages/WorldLore.tsx` | Render both tabs always (hidden/shown via CSS); load/save knowledge graph from `world_lore_entries` |
| `src/hooks/useWorldLore.ts` | Filter out `entry_type = 'knowledge_graph'` from the lore entries query |

No database changes needed -- the existing `world_lore_entries` table and its `metadata` jsonb column are sufficient.
