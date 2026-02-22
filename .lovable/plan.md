

# Fix Architecture Page: Game Integration Scaffold + Cleanup

## Summary

Wire up the "Map Game Integration" button to actually create a game design workflow (saved to `studio_workflows`), load saved game designs on page load, remove the non-functional fullscreen button, and add the missing `picoclaw-agent` node icon/color mapping.

## Issues Found

1. **"Map Game Integration" button does nothing** -- `handleScaffoldGameDesign` only logs to console
2. **`gameDesignExists` is hardcoded to `false`** -- never loads saved game designs from DB
3. **`picoclaw-agent` node type has no icon/color** -- will render blank if used in game design diagrams
4. **No way to delete a game design** -- once created, need a reset/delete option
5. **No visual indicator on SystemCard** that a game design exists

## What Changes

### 1. `src/components/dashboard/ArchitectureView.tsx` -- Major Update

**Load saved game designs from DB:**
- Query `studio_workflows` where `description LIKE '[arch:{systemId}]%'` using React Query
- Parse `nodes_data` and `connections_data` from the saved workflow
- Track which systems have game designs via a `Map<string, { id, nodes, connections }>`

**Scaffold button creates a real game design:**
- When clicked, duplicate the selected system's nodes (offset Y by +50 for visual separation)
- Add 3 starter game nodes: a PicoClaw Agent node, a "Show Text" game node, and a "Game Give Item" node, positioned below the system nodes
- Add a starter connection from the system's response/output node to the PicoClaw Agent
- Upsert to `studio_workflows` with:
  - `name`: "Game Design: {system title}"
  - `description`: "[arch:{systemId}] Game integration mapping"
  - `nodes_data`: the duplicated + new nodes as JSONB
  - `connections_data`: the duplicated + new connections as JSONB
  - `status`: "draft"
- After save, refetch the query so the UI updates immediately

**Show saved game design in bottom canvas:**
- When a game design exists for the selected system, render `ArchitectureCanvas` with the saved nodes/connections instead of the placeholder
- Add a small "Delete" button (trash icon) in the Game Integration header bar to remove the saved workflow and revert to placeholder

**Remove fullscreen button references** (there aren't any in the current code, but the plan from before mentioned it -- confirming it was never added, so no cleanup needed there).

### 2. `src/components/dashboard/SystemCard.tsx` -- Small Badge

- Accept an optional `hasGameDesign` boolean prop
- When true, show a small Gamepad2 icon indicator next to the node count text

### 3. `src/components/canvas/CanvasNode.tsx` -- Add picoclaw-agent

- Add `'picoclaw-agent': Bot` to `nodeIcons` (reuse Bot icon)
- Add `'picoclaw-agent': 'text-teal-400'` to `nodeColors`

### 4. `src/components/dashboard/architectureDiagrams.ts` -- Helper Export

- Export a helper function `getGameScaffoldNodes(systemId)` that returns the starter game nodes and connections for a given system. Each system gets:
  - All original system nodes (cloned)
  - All original connections (cloned)
  - A PicoClaw Agent node (type `picoclaw-agent`)
  - A "Show Text" node (type `game-show-text`)
  - A "Give Item" node (type `game-give-item`)
  - Connections from the system's last output node to the PicoClaw Agent, and from PicoClaw to Show Text

## Technical Details

### Database Interaction

Uses existing `studio_workflows` table -- no schema changes. Game design workflows are identified by the `[arch:{id}]` tag in the `description` field.

```
SELECT * FROM studio_workflows WHERE description LIKE '[arch:%]%'
```

This loads all game designs in one query. The component maps them by system ID.

### Scaffold Node Positioning

Original system nodes are cloned as-is. Game-specific nodes are placed below them:
- PicoClaw Agent: positioned at `row(1, maxRow + 1)`  
- Show Text: positioned at `row(2, maxRow + 1)`
- Give Item: positioned at `row(3, maxRow + 1)`

Where `maxRow` is the highest row index used by the original system nodes.

### React Query Integration

- Query key: `['arch-game-designs']`
- Fetches all `studio_workflows` with `description LIKE '[arch:%]%'`
- `useMutation` for create/delete with `invalidateQueries` on success
- Uses `@tanstack/react-query` already installed in the project

### Files Changed

| File | Change |
|------|--------|
| `src/components/dashboard/ArchitectureView.tsx` | Add React Query load/save, wire scaffold button, render saved designs, add delete button |
| `src/components/dashboard/SystemCard.tsx` | Add `hasGameDesign` prop with Gamepad2 indicator |
| `src/components/canvas/CanvasNode.tsx` | Add `picoclaw-agent` to icon and color maps |
| `src/components/dashboard/architectureDiagrams.ts` | Add `getGameScaffoldNodes()` helper |

