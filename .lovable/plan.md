

# Single-Page Architecture: System Cards + Canvas Side-by-Side

## What Changes

Merge the catalog and detail views into one unified layout. The system cards are always visible on the left as a compact list, and the canvas + detail sidebar fill the right side. Clicking a card updates the canvas instantly — no navigation, no back button.

## Layout

```text
+---------------------------+----------------------------------------------+
| System Cards (left rail)  |  Canvas (center)            | Detail (right) |
|                           |                             |                |
| [* NPC Chat Pipeline   ] |  CanvasNode --- CanvasNode  | Edge Functions |
| [  PicoClaw Deploy     ] |       |             |       | - npc-ai-chat  |
| [  Studio Workflows    ] |  CanvasNode --- CanvasNode  | Tables         |
| [  Lore Pipeline       ] |                             | - agent_configs|
| [  Game Objects        ] |                             |                |
| [  AI Services         ] |                             |                |
+---------------------------+----------------------------------------------+
```

- Left column (~240px): Compact vertical list of system cards (always visible, selected one is highlighted)
- Center: The interactive canvas diagram for the selected system
- Right column (~280px): Detail sidebar with edge functions and tables

On first load, the first system (NPC Chat Pipeline) is auto-selected so the canvas is never empty.

## Technical Changes

### `src/components/dashboard/ArchitectureView.tsx`
- Remove the conditional rendering (catalog vs. detail) and the back button
- Default `selectedId` to `SYSTEM_DIAGRAMS[0].id` instead of `null`
- Render a 3-column layout: compact card list | canvas | detail sidebar
- The system cards become smaller (icon + title only, no description) styled as a vertical nav list with an active indicator

### `src/components/dashboard/SystemCard.tsx`
- Add an `isActive` prop and a compact variant
- When active: highlighted border/bg matching the system's color
- Remove the chevron and description in this compact mode, keep icon + title + node count

### `src/pages/ArchitecturePage.tsx`
- Remove the subtitle text since the layout is self-explanatory

No changes needed to `ArchitectureCanvas.tsx` or `architectureDiagrams.ts` — they already work with props.

---

## Additional Architecture Diagrams to Add

Here are diagrams we could add using the same canvas patterns, based on real systems in the codebase:

1. **Authentication Flow** -- Login page -> Supabase Auth -> AuthContext -> Protected routes -> Session management. Tables: `auth.users`, `profiles`.

2. **Game Registry Sync** -- How the game repo and studio share data through `game_registry`, `map_regions`, and realtime broadcasts via `gameBroadcast.ts`.

3. **Memory Service Pipeline** -- How `memoryService.ts` and `studioMemoryService.ts` read/write agent memory, with the recall/store cycle and context window building.

4. **Credential Management** -- How `manage-credential` edge function encrypts/stores API keys, and how other edge functions retrieve them at runtime from `studio_credentials`.

5. **Image Generation Pipeline** -- `generate-image` edge function -> external API -> storage upload -> URL return. Covers the Gemini Vision analysis path too.

6. **Fragment Discovery System** -- Deep dive into `decipher-fragment`: how players find fragments, the chunk-reveal mechanic, broadcast events, and progress tracking in `fragment_archive`.

7. **Workflow Scheduler** -- How `workflow-scheduler` edge function handles cron-based triggers, checks `workflow_schedules`, and fires `studio-run`.

8. **n8n Webhook Bridge** -- How `n8n_webhook_registry` maps game events to external n8n workflows, including the object-action routing and studio-run forwarding paths.

9. **Map Entity System** -- How `object_templates`, `object_instances`, and `map_regions` connect. The CRUD flow through `object-api` and the entity mini-map visualization.

10. **Realtime Event Broadcasting** -- How `gameBroadcast.ts` uses Supabase Realtime channels to push NPC responses, fragment reveals, and game state updates to the client.

