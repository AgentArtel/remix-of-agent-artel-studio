# TASK-S-2: Integrations Page — Verify & Polish

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Agent-Artel-studio (Studio)
**Agent:** Lovable
**Status:** MERGED — verify against spec, fix bugs, polish UX

---

## Status

The Integrations page has been **built and merged to main**:

- `src/pages/Integrations.tsx` — full CRUD with modal form, search, category badges, env var tag input
- Sidebar: "Integrations" entry with Puzzle icon, after NPCs
- App.tsx: `'integrations'` in Page type, `Integrations` case in `renderPage()`

All game queries use `gameDb()`. React Query invalidates both `game-api-integrations-full` and `game-api-integrations` query keys on mutations. Toast notifications on all operations.

**This brief is NOT build-from-scratch. The task is: verify the merged code against the spec, test all CRUD flows with the live database, and fix any bugs or UX rough edges.**

---

## Verification Checklist

Test against the live Supabase database with the 1 seed integration (Image Generation / `generate_image`).

### Core CRUD
- [ ] Integrations list loads and shows the seed "Image Generation" entry
- [ ] Creating a new integration inserts a row — verify in list and database
- [ ] Editing the seed integration (e.g., change description) persists
- [ ] Deleting an integration removes the row (use a test integration, not the seed)
- [ ] Toggling enabled/disabled updates the column and card visual state

### Form Fields
- [ ] ID auto-slugifies from name on create
- [ ] ID is read-only on edit
- [ ] Description textarea saves correctly (including empty/null)
- [ ] Skill name saves and is shown in mono font on the card
- [ ] Required Item ID saves correctly
- [ ] Category select shows `api`, `social`, `knowledge` — badge colors match (blue, purple, amber)
- [ ] Enabled toggle works in the form

### Environment Variables (Tag Input)
- [ ] Can add an env var by typing and pressing Enter or clicking "Add"
- [ ] Env var is auto-uppercased (e.g., typing "gemini_api_key" becomes "GEMINI_API_KEY")
- [ ] Can remove an env var by clicking the X on the tag
- [ ] Duplicate env vars are prevented
- [ ] Seed integration shows `GEMINI_API_KEY` tag on the card

### Cross-Page Integration
- [ ] After creating/editing an integration, the NPC Builder's API Skills section updates (new skill appears as a checkbox)
- [ ] Disabling an integration hides it from the NPC Builder's API Skills list

### Schema Compliance
- [ ] All queries go through `gameDb()` — zero direct `supabase.from('api_integrations')` calls
- [ ] Verify in Network tab

### Error Handling
- [ ] Save with missing required fields (name, skill_name, required_item_id) shows error toast
- [ ] Delete confirmation dialog before deletion
- [ ] Network errors show error toast

---

## Known Polish Opportunities

1. **`skill_name` uniqueness not enforced in UI** — the database has a UNIQUE constraint, so duplicate inserts will fail with a Supabase error. Consider catching this specific error and showing a friendly "Skill name already exists" message.
2. **Delete uses `window.confirm()`** — same as S-1, could use a styled AlertDialog.
3. **All form state is local (not in a separate modal component)** — unlike S-1 which has a dedicated `NPCFormModal`, the Integrations form is inline in the page. This works fine but is less modular. Optional refactor to extract an `IntegrationFormModal` component.
4. **Search filters by name OR skill_name** — good, but the placeholder only says "Search integrations..." Consider making it "Search by name or skill..."

---

## Acceptance Criteria

- [ ] All verification checklist items pass.
- [ ] No console errors on the Integrations page.
- [ ] CRUD operations work end-to-end with the live Supabase database.
- [ ] Skill_name uniqueness error is caught gracefully (polish item #1) — optional.

## Reference

- Spec: `docs/game-integration/TASK-game-schema-integration.md` (section 2)
- Schema: `Open-RPG/docs/supabase-schema.md` (`game.api_integrations`)
