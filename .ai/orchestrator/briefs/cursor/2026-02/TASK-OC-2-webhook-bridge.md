# TASK-OC-2: Webhook Bridge Component

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game)
**Agent:** Cursor
**Priority:** Wave 4
**Depends on:** OC-1 (BYOC Setup complete)
**Blocks:** OC-4 (Config Schema)

---

## Goal

Create the `WebhookBridge` class that replaces `AgentRunner` for OpenClaw-mode NPCs. This is the single key new component in the brain/body architecture split.

## Context

`AgentRunner` (`src/agents/core/AgentRunner.ts`) is the current brain. It implements `IAgentRunner` with a `run(event)` method that calls the LLM, executes tools, and returns `AgentRunResult`. `WebhookBridge` implements the same interface but replaces the LLM call with an HTTP POST to the local OpenClaw agent.

Everything upstream (GameChannelAdapter, Bridge, LaneQueue) and downstream (SkillRegistry, Memory) stays unchanged. The only difference is inside `run()`.

Reference: [direction-shift-openclaw-integration.md](../../orchestrator/2026-02/direction-shift-openclaw-integration.md) — Sections 3 and 4.

## Deliverables

1. **`WebhookBridge.ts`** — new file at `src/agents/core/WebhookBridge.ts` implementing `IAgentRunner`.
   - Constructor: same deps as AgentRunner (config, perception, skills, memory, getContext) plus `webhookUrl` and `webhookToken`
   - `run(event)`: gets context, generates perception, gets memory, POSTs to OpenClaw, parses response, validates actions, executes skills, stores memory, returns `AgentRunResult`
   - Timeout: 5s default (configurable), returns safe `wait` fallback on timeout
   - Auth: `Authorization: Bearer ${webhookToken}` header
   - Uses native `fetch` (Node 18+, no axios)

2. **Webhook types** — `OpenClawWebhookRequest` and `OpenClawWebhookResponse` interfaces, in `src/agents/core/types.ts` or new `src/agents/core/webhook-types.ts`:
   ```typescript
   interface OpenClawWebhookRequest {
     agent_id: string;
     event: { type: AgentEventType; timestamp: number; player?: PlayerSnapshot };
     perception: { summary: string; entities: NearbyEntity[]; location: PerceptionLocation };
     memory: Array<{ role: string; content: string }>;
     available_skills: string[];
   }

   interface OpenClawWebhookResponse {
     text?: string;
     actions: Array<{ skill: string; params: Record<string, unknown> }>;
     metadata?: { model?: string; tokens?: { input: number; output: number }; duration_ms?: number };
   }
   ```

3. **AgentManager mode check** — in `registerAgent()`, check `config.agentMode` and instantiate `WebhookBridge` (with webhookUrl from config or env) or `AgentRunner`. ~15 lines in `AgentManager.ts`.

4. **Environment variables**:
   - `OPENCLAW_WEBHOOK_URL` (default: `http://localhost:3001/webhook`)
   - `OPENCLAW_WEBHOOK_TOKEN` (required for auth, no default)

5. **Manual test** — switch one NPC (Elder Theron) to OpenClaw mode via direct DB edit, verify conversations still work.

## Acceptance Criteria

- [ ] `WebhookBridge` implements `IAgentRunner` (`run`, `buildSystemPrompt`, `dispose`)
- [ ] `WebhookBridge.run()` POSTs to OpenClaw and parses the response
- [ ] Response actions are validated: skill names must be in `config.skills`
- [ ] Timeout (5s) returns a safe fallback (`wait` skill)
- [ ] Non-2xx responses return failed `AgentRunResult` (no crash)
- [ ] `AgentManager` creates `WebhookBridge` when `config.agentMode === 'openclaw'`
- [ ] `AgentManager` creates `AgentRunner` when `config.agentMode === 'in-process'` (or undefined)
- [ ] Elder Theron works in OpenClaw mode with identical observable behavior

## Do

- Follow the `SupabaseAgentMemory` pattern for error handling (log, don't throw)
- Use native `fetch` (Node 18+, no axios dependency)
- Validate response schema before executing actions
- Include request timing in `AgentRunResult.durationMs`
- Log webhook request/response at debug level

## Don't

- Don't modify GameChannelAdapter, Bridge, LaneQueue, or SkillRegistry
- Don't remove AgentRunner — it's the fallback for in-process mode
- Don't send game-side secrets (Supabase keys, etc.) in webhook payloads
- Don't install OpenClaw as an npm dependency in the game server

## Reference

- AgentRunner implementation: `src/agents/core/AgentRunner.ts` (lines 112-271)
- IAgentRunner interface: `src/agents/core/types.ts` (lines 368-395)
- AgentManager.registerAgent(): `src/agents/core/AgentManager.ts` (line 336)
- LLMClient (reference for swap pattern): `src/agents/core/LLMClient.ts`
- Direction-shift brief: `.ai/briefs/orchestrator/2026-02/direction-shift-openclaw-integration.md`
