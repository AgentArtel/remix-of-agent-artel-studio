# TASK-OC-5: Studio OpenClaw Integration

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Agent-Artel-studio
**Agent:** Lovable
**Priority:** Wave 4 (last OC task)
**Depends on:** OC-4 (migration 014 applied, new columns available)
**Blocks:** Nothing

---

## Goal

Update the NPC Builder and Dashboard in Studio to support OpenClaw-mode NPCs. Add an agent mode toggle, OpenClaw configuration fields, and agent status display.

## Context

After migration 014, `game.agent_configs` has three new columns:
- `agent_mode` ('in-process' | 'openclaw')
- `openclaw_agent_id` (text, nullable)
- `openclaw_webhook_url` (text, nullable)

Studio's NPC Builder (`src/pages/NPCs.tsx` + `src/components/npcs/`) already does full CRUD on `agent_configs`. This task adds UI for the new columns.

Reference: [direction-shift-openclaw-integration.md](../../orchestrator/2026-02/direction-shift-openclaw-integration.md) — full architecture context.

## Deliverables

1. **Agent Mode Toggle** in NPC form:
   - Radio or select: "In-Process" or "OpenClaw"
   - When "OpenClaw" selected → show OpenClaw fields
   - When "In-Process" selected → hide OpenClaw fields
   - Default: "In-Process" for new NPCs

2. **OpenClaw Fields** (conditional, shown when mode = "openclaw"):
   - OpenClaw Agent ID (text input, helper: "Agent identifier from Kimi Claw")
   - Webhook URL Override (text input, placeholder: "Uses default from server env")
   - "Open in Kimi Claw" link button (opens `https://kimi.com` in new tab)

3. **Dashboard Enhancement**:
   - Agent mode breakdown on NPC count card: "4 NPCs — 2 in-process, 2 openclaw"
   - New query: count by `agent_mode` grouping

4. **NPC List View** — mode badge per NPC row:
   - "In-Process" → subtle gray badge
   - "OpenClaw" → green badge with external link icon

5. **Game types update** — add new columns to GameDatabase type definition in `src/integrations/supabase/game-types.ts`

## Acceptance Criteria

- [ ] NPC Builder form shows agent mode selector
- [ ] OpenClaw fields appear/hide based on mode selection
- [ ] Creating an NPC with mode "openclaw" correctly writes all 3 new columns to DB
- [ ] Editing mode from in-process to openclaw persists correctly
- [ ] Dashboard shows mode breakdown count
- [ ] NPC list shows mode badge per row
- [ ] Game types include new columns (no TypeScript errors)
- [ ] Existing NPC CRUD (create/edit/delete in-process NPCs) still works perfectly

## Do

- Follow existing NPC Builder patterns (same component structure, same `gameDb()` usage)
- Make OpenClaw fields optional (nullable in DB)
- Default mode to "In-Process" for new NPCs
- Use existing badge styling patterns from the Integrations page

## Don't

- Don't build a full OpenClaw management UI — that's Kimi Claw's job
- Don't store API keys or webhook tokens in the database
- Don't modify the game schema — migration 014 is already applied by Cursor
- Don't add OpenClaw runtime monitoring — Kimi Claw provides its own dashboard

## Reference

- NPC Builder: `src/pages/NPCs.tsx` + `src/components/npcs/`
- Game types: `src/integrations/supabase/game-types.ts`
- gameDb helper: `src/lib/gameSchema.ts`
- Integrations page (badge patterns): `src/pages/Integrations.tsx`
- Direction-shift brief: `.ai/briefs/orchestrator/2026-02/direction-shift-openclaw-integration.md`
