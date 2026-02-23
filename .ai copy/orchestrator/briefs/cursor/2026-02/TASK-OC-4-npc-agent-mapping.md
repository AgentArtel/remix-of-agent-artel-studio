# TASK-OC-4: NPC-to-OpenClaw Agent Mapping (Config Schema + Migration 014)

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Priority:** Wave 4
**Depends on:** OC-2 (WebhookBridge built), OC-3 (SKILL.md files ready)
**Blocks:** OC-5 (Studio needs new columns)

---

## Goal

Add `agent_mode`, `openclaw_agent_id`, and `openclaw_webhook_url` columns to `game.agent_configs` so each NPC can be independently configured to run in-process or via OpenClaw.

## Context

After OC-2 (WebhookBridge), the game server can run NPCs in two modes. But mode selection is currently hardcoded. This task makes it data-driven: each NPC row in `game.agent_configs` declares its mode. Studio (OC-5) will later expose this in the NPC Builder UI.

Reference: [direction-shift-openclaw-integration.md](../../orchestrator/2026-02/direction-shift-openclaw-integration.md) — Sections 6 and 7.

## Deliverables

1. **Migration 014** — `supabase/migrations/014_openclaw_agent_mode.sql`:
   ```sql
   ALTER TABLE game.agent_configs
     ADD COLUMN agent_mode text NOT NULL DEFAULT 'in-process'
       CHECK (agent_mode IN ('in-process', 'openclaw')),
     ADD COLUMN openclaw_agent_id text,
     ADD COLUMN openclaw_webhook_url text;

   COMMENT ON COLUMN game.agent_configs.agent_mode IS
     'How this NPC''s brain runs: in-process (AgentRunner) or openclaw (WebhookBridge)';
   COMMENT ON COLUMN game.agent_configs.openclaw_agent_id IS
     'OpenClaw agent identifier in Kimi Claw. NULL for in-process NPCs.';
   COMMENT ON COLUMN game.agent_configs.openclaw_webhook_url IS
     'Override webhook URL. NULL uses default from OPENCLAW_WEBHOOK_URL env var.';
   ```

2. **AgentConfig interface update** — add `agentMode`, `openclawAgentId`, `openclawWebhookUrl` to `AgentConfig` in `src/agents/core/types.ts`.

3. **`rowToAgentConfig()` update** — parse new columns from Supabase rows in `AgentManager.ts` (~line 67).

4. **`parseAgentConfig()` update** — handle new fields from YAML with defaults (`agentMode: 'in-process'`) in `AgentManager.ts` (~line 133).

5. **`registerAgent()` update** — complete the database-driven mode selection. Check `config.agentMode`:
   - `'in-process'` → create `AgentRunner` (existing behavior)
   - `'openclaw'` → create `WebhookBridge` with `config.openclawWebhookUrl ?? process.env.OPENCLAW_WEBHOOK_URL`

## Acceptance Criteria

- [ ] Migration 014 applies cleanly on top of existing migrations (009-013)
- [ ] All existing NPCs default to `agent_mode = 'in-process'` (no behavior change)
- [ ] Changing `agent_mode` to `'openclaw'` in Supabase causes AgentManager to use WebhookBridge for that NPC on next spawn
- [ ] `openclaw_webhook_url` overrides the default `OPENCLAW_WEBHOOK_URL` env var per-NPC
- [ ] YAML configs still work with default in-process mode
- [ ] Studio can read and write the new columns via `gameDb()`

## Do

- Follow migration numbering pattern (014 after 013)
- Follow grant pattern from 011/012 — new columns inherit table grants (ALTER DEFAULT PRIVILEGES already covers new columns on existing tables)
- Add `COMMENT ON COLUMN` for all new columns (match 009 style)
- Default `agent_mode` to `'in-process'` with `CHECK` constraint

## Don't

- Don't change existing column definitions
- Don't add RLS (consistent with all game schema tables)
- Don't make `openclaw_agent_id` or `openclaw_webhook_url` NOT NULL (only needed for openclaw mode)
- Don't remove in-process mode support

## Reference

- Migration 009: `supabase/migrations/009_game_schema.sql` (agent_configs definition)
- Migration 012: `supabase/migrations/012_map_entities.sql` (recent migration pattern)
- Migration 013: `.ai/migrations/013_content_store.sql` (content store, latest)
- AgentConfig type: `src/agents/core/types.ts` (~line 109)
- AgentManager: `src/agents/core/AgentManager.ts`
