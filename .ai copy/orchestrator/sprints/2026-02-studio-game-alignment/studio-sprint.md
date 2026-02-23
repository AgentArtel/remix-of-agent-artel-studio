# Studio Sprint Slice — 2026-02

> Lovable's view of the master sprint. Studio repo (Agent-Artel-studio) tasks only.
> Master: [master.md](master.md)
> **Direction shift:** Architecture pivoting to brain/body split with OpenClaw. See [direction-shift brief](../../briefs/orchestrator/2026-02/direction-shift-openclaw-integration.md).

---

## Studio Tasks

| ID | Title | Status | Brief |
|----|-------|--------|-------|
| S-1 | NPC Builder Page (CRUD for agent_configs) | **MERGED** — verify & polish | [Brief](../../briefs/lovable/2026-02/TASK-S-1-npc-builder-ui.md) |
| S-2 | Integrations Page (CRUD for api_integrations) | **MERGED** — verify & polish | [Brief](../../briefs/lovable/2026-02/TASK-S-2-integrations-page.md) |
| S-3 | Dashboard Game Stats | **MERGED** — verify & polish | [Brief](../../briefs/lovable/2026-02/TASK-S-3-dashboard-game-stats.md) |
| S-4 | NPC Memory Viewer | TODO — unblocked, brief ready | [Brief](../../briefs/lovable/2026-02/TASK-S-4-npc-memory-viewer.md) |
| S-5 | Lovable Feed Integration | TODO | Brief TBD (depends on game social feed) |
| S-6 | Map Entity Browser | TODO | Browse `game.map_entities` per map, link ai-npc rows to NPC Builder; depends on D-6 |
| OC-5 | Studio OpenClaw Integration | TODO | [Brief](../../briefs/lovable/2026-02/TASK-OC-5-studio-openclaw-integration.md) — NPC Builder mode toggle, OpenClaw fields, dashboard status |

## Order

1. **S-1, S-2, S-3** are MERGED — briefs now say "verify, test, polish" (not build from scratch)
2. **S-4** is unblocked (S-1 merged) — NPC Memory Viewer is a tab inside the NPC detail view
3. **S-6** after D-6 ships — Map Entity Browser reads `game.map_entities`, links ai-npc rows to NPC Builder for full config
4. **S-5** after game finishes G-4 — social feed UI needs game data to render
5. **OC-5** after OC-4 (migration 014 applied by Cursor) — add agent_mode toggle and OpenClaw fields to NPC Builder

## Deprioritized Features (replaced by Kimi Claw)

The following Studio features are deprioritized as of 2026-02-15. Kimi Claw provides equivalent functionality for OpenClaw-managed NPCs. These pages remain in the codebase but receive no further investment.

| Feature | Page | Replacement |
|---------|------|-------------|
| Workflow Editor Canvas | WorkflowEditorPage.tsx (~1,044 lines) | Kimi Claw agent config UI |
| Workflow List | WorkflowList.tsx | Kimi Claw agent list |
| Credentials | Credentials.tsx | OpenClaw secret management |
| Execution History | ExecutionHistory.tsx | Kimi Claw execution logs |
| Agent Library | AgentLibrary.tsx | ClawHub skill marketplace |

## What's Already Built

All three features are in the Studio repo on main:
- `src/lib/gameSchema.ts` — `gameDb()` helper (all game queries use it)
- `src/pages/NPCs.tsx` + `src/components/npcs/` — full NPC CRUD with form modal
- `src/pages/Integrations.tsx` — full Integrations CRUD with env var tag input
- `src/pages/Dashboard.tsx` — game stats section with 4 cards
- Sidebar: NPCs (Users icon), Integrations (Puzzle icon) both in nav
- App.tsx: routing for both pages

## Key Constraints (still apply for verify & polish)

- **Every game table query MUST use `supabase.schema('game').from(...)`** or the `gameDb()` helper — already the case, verify it stays that way.
- Studio tables (`studio_*`) use default schema (no prefix).
- JSON columns (`model`, `spawn`, `behavior`) are built/parsed from individual form fields — verify correct round-trip.
- When an API skill is selected in the NPC form, `required_item_id` is auto-added to inventory — verify this works.

## Existing Specs (in Studio repo)

These contain full detail — briefs reference them:
- `docs/game-integration/NPC-BUILDER-PLAN.md` — canonical NPC Builder spec
- `docs/game-integration/TASK-game-schema-integration.md` — full schema integration task
- `docs/game-integration/VISION-studio-game-architecture.md` — architecture context
- `docs/game-integration/LOVABLE-PROMPTS.md` — pre-written Lovable prompts
