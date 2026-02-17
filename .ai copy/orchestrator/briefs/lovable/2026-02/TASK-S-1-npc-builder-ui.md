# TASK-S-1: NPC Builder Page — Verify & Polish

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Agent-Artel-studio (Studio)
**Agent:** Lovable
**Status:** MERGED — verify against spec, fix bugs, polish UX
**Blocks:** S-4 (NPC Memory Viewer)

---

## Status

The NPC Builder page has been **built and merged to main**. The following files are in place:

- `src/lib/gameSchema.ts` — `gameDb()` helper
- `src/pages/NPCs.tsx` — list page with search, create, CRUD mutations
- `src/components/npcs/NPCCard.tsx` — card grid item
- `src/components/npcs/NPCFormModal.tsx` — create/edit modal with all fields
- `src/components/npcs/index.ts` — barrel
- Sidebar: "NPCs" entry with Users icon, between Workflows and Integrations
- App.tsx: `'npcs'` in Page type, `NpcBuilder` case in `renderPage()`

All game queries use `gameDb()`. React Query, toast notifications, and search/filter are wired up.

**This brief is NOT build-from-scratch. The task is: verify the merged code against the spec, test all CRUD flows with the live database, and fix any bugs or UX rough edges.**

---

## Verification Checklist

Test each item against the live Supabase database with the 4 seed NPCs (Elder Theron, Test Agent, Photographer, Artist) and 1 seed integration (Image Generation).

### Core CRUD
- [ ] NPC list loads and shows all 4 seed NPCs from `game.agent_configs`
- [ ] Creating a new NPC inserts a row — verify it appears in the list and in the database
- [ ] Editing an existing NPC (e.g., change Elder Theron's personality) persists the update
- [ ] Deleting an NPC removes the row (test with a disposable NPC, not a seed one)
- [ ] Toggling enabled/disabled updates the `enabled` column and the card visual state updates immediately

### Form Fields
- [ ] ID auto-slugifies from name on create (e.g., "Village Guard" → "village-guard")
- [ ] ID is read-only on edit (cannot change primary key)
- [ ] Graphic select shows "Male" and "Female" options
- [ ] Personality textarea saves multiline text correctly
- [ ] Idle Model and Conversation Model dropdowns show all 3 options: `kimi-k2-0711-preview`, `gemini-2.5-flash`, `gemini-2.5-pro`
- [ ] Model values save as JSON `{ idle: "...", conversation: "..." }` — verify in database
- [ ] Spawn map, X, Y save as JSON `{ map: "...", x: N, y: N }` — verify in database
- [ ] Behavior fields (idleInterval, patrolRadius, greetOnProximity) save as JSON — verify
- [ ] Defaults work correctly: idleInterval=15000, patrolRadius=3, greetOnProximity=true

### Skills + Inventory
- [ ] Game skills checkboxes (move, say, look, emote, wait) display and toggle correctly
- [ ] API skills section appears with "Image Generation" checkbox (fetched from `api_integrations`)
- [ ] Selecting `generate_image` API skill auto-adds `image-gen-token` to inventory
- [ ] Unchecking `generate_image` removes `image-gen-token` from inventory
- [ ] Inventory tokens display as green chips when API skills are selected
- [ ] Verify the Photographer's existing skills include `generate_image` and inventory includes `image-gen-token` when opened for edit

### Schema Compliance
- [ ] Zero queries hit `public.agent_configs` — all go through `gameDb()` / `.schema('game')`
- [ ] Verify by checking browser Network tab: requests should target the `game` schema

### Error Handling
- [ ] Create with empty name shows appropriate feedback (button disabled or error toast)
- [ ] Network error during save shows error toast (test by temporarily breaking Supabase URL)
- [ ] Delete confirmation dialog appears before deletion

---

## Known Polish Opportunities

Found during code review — fix if time permits, or flag for a follow-up:

1. **Delete confirmation uses `window.confirm()`** — consider upgrading to a styled AlertDialog component (shadcn) for consistency with the rest of the UI.
2. **`handleSave` types `data` as `any`** in NPCs.tsx line 134 — could be properly typed as `AgentConfig`.
3. **Duplicate `AgentConfig` interface** — defined in both `NPCs.tsx` and `NPCFormModal.tsx`. Extract to a shared types file (e.g., `src/types/game.ts`).
4. **No form validation beyond empty name/id** — consider adding min-length for personality, numeric bounds for spawn coordinates, etc.
5. **Inventory section only shows when non-empty** — if a user wants to manually add tokens (not just auto-managed from API skills), there's no UI for that. Acceptable for now since auto-inventory covers the use case.
6. **`spawn` prop cast as `any`** in NPCs.tsx line 184 — should use the proper type.

---

## Acceptance Criteria

- [ ] All verification checklist items pass.
- [ ] No console errors when using the NPC Builder page.
- [ ] CRUD operations work end-to-end with the live Supabase database.
- [ ] `window.confirm()` for delete replaced with styled dialog (polish item #1) — optional.
- [ ] Duplicate `AgentConfig` type extracted to shared file (polish item #3) — optional.

## Reference

- Canonical spec: `docs/game-integration/NPC-BUILDER-PLAN.md`
- Architecture: `docs/game-integration/VISION-studio-game-architecture.md`
- Schema: `Open-RPG/docs/supabase-schema.md`
