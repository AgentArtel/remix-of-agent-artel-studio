# Direction Shift: OpenClaw Brain/Body Integration

**Date:** 2026-02-15
**Author:** Orchestrator (Claude)
**Sprint:** 2026-02-studio-game-alignment
**Status:** APPROVED — new tasks OC-1 through OC-5 added as Wave 4

---

## 1. Executive Summary

We are splitting NPC intelligence into **brain** (OpenClaw agent on local hardware, managed via Kimi Claw web UI) and **body** (RPGJS entity on the game server). The game becomes a perception-and-action shell. OpenClaw provides the thinking, 5,000+ ClawHub skills, and Kimi Claw's web dashboard for agent management.

**Motivation:** Stop building a full orchestration engine in Studio (workflow canvas, credentials, execution history). Use OpenClaw for what it's good at (agent intelligence, external API access, management UI) and focus our effort on what only we can build (the game world, NPC bodies, content pipeline).

**Scope:** This brief covers architecture, migration plan, task breakdown, and sprint impact. It does NOT require a big-bang rewrite — NPCs switch modes individually. All existing Wave 1-3 work continues unchanged.

**Key insight:** The existing codebase already has a clean brain/body interface boundary. `AgentRunner` has zero RPGJS imports. The `IAgentRunner` interface is the perfect seam — `WebhookBridge` implements the same interface, replacing in-process LLM calls with HTTP POSTs to local OpenClaw.

---

## 2. Architecture — Brain/Body Split

### Current (Monolithic)

```
Player Action
    → GameChannelAdapter (captures RPGJS hook, normalizes to AgentEvent)
    → LaneQueue (serial per-NPC execution)
    → AgentRunner.run(event)
        ├─ PerceptionEngine.generateSnapshot()  → world state as text
        ├─ buildSystemPrompt(snapshot)           → personality + context + rules
        ├─ LLMClient.complete(messages, tools)   → Moonshot Kimi API call
        ├─ [tool loop: execute skills, feed results back, up to 5 iterations]
        └─ memory.addMessage(response)
    → AgentRunResult
    → RPGJS renders (speech bubble, movement, etc.)
```

### Proposed (Split)

```
Player Action
    → GameChannelAdapter (UNCHANGED)
    → LaneQueue (UNCHANGED)
    → WebhookBridge.run(event)                      ← NEW, replaces AgentRunner
        ├─ PerceptionEngine.generateSnapshot()       (UNCHANGED)
        ├─ memory.getRecentContext(2000)              (UNCHANGED)
        ├─ HTTP POST to local OpenClaw agent          ← NEW
        │     └─ OpenClaw thinks: Kimi K2.5 + SKILL.md knowledge + ClawHub skills
        │     └─ Returns: {text, actions: [{skill, params}]}
        ├─ FOR EACH action: skills.executeSkill()    (UNCHANGED)
        └─ memory.addMessage(response.text)          (UNCHANGED)
    → AgentRunResult
    → RPGJS renders (UNCHANGED)
```

### Mode Selection

```
AgentManager.registerAgent(config)
        │
        ├── config.agent_mode === 'in-process'
        │       └── new AgentRunner(...)          ← existing behavior
        │
        └── config.agent_mode === 'openclaw'
                └── new WebhookBridge(...)        ← new behavior
        │
        └── both feed into ──→ SkillRegistry.executeSkill() → RPGJS
```

Both modes share: GameChannelAdapter → LaneQueue → [runner] → SkillRegistry → RPGJS

---

## 3. Component Disposition Table

| Component | File | Current Role | New Role | Action |
|-----------|------|-------------|----------|--------|
| AgentRunner | `src/agents/core/AgentRunner.ts` | Think-act LLM loop | Brain (in-process mode only) | KEEP as fallback |
| LLMClient | `src/agents/core/LLMClient.ts` | Moonshot API wrapper | Not used for OpenClaw NPCs | KEEP for in-process mode |
| **WebhookBridge** | `src/agents/core/WebhookBridge.ts` | N/A | Brain proxy (webhook to OpenClaw) | **CREATE** |
| GameChannelAdapter | `src/agents/bridge/GameChannelAdapter.ts` | Captures RPGJS hooks | Body (unchanged) | KEEP |
| Bridge | `src/agents/bridge/Bridge.ts` | Routes events to adapters | Body (unchanged) | KEEP |
| PerceptionEngine | `src/agents/perception/PerceptionEngine.ts` | Generates world snapshots | Body (builds webhook payload) | KEEP |
| SkillRegistry + 6 Skills | `src/agents/skills/` | Executes game actions | Body (executes OpenClaw responses) | KEEP |
| LaneQueue | `src/agents/core/LaneQueue.ts` | Serial execution per NPC | Body (still serializes) | KEEP |
| SupabaseAgentMemory | `src/agents/memory/SupabaseAgentMemory.ts` | Write-behind to agent_memory | Body (memory + Supabase sync) | KEEP |
| AgentManager | `src/agents/core/AgentManager.ts` | Orchestrates NPC lifecycle | Body (adds mode switching) | **MODIFY** (~15 lines) |
| Workflow Canvas | `Studio: WorkflowEditorPage.tsx` | Visual orchestration builder | Replaced by Kimi Claw UI | **DEPRIORITIZE** |
| Credentials Page | `Studio: Credentials.tsx` | API key management | OpenClaw manages secrets | **DEPRIORITIZE** |
| Execution History | `Studio: ExecutionHistory.tsx` | Workflow execution logs | Kimi Claw has its own logs | **DEPRIORITIZE** |
| Agent Library | `Studio: AgentLibrary.tsx` | Template gallery | ClawHub skill marketplace | **DEPRIORITIZE** |

---

## 4. The Webhook Bridge — Key New Component

### Class Spec

`WebhookBridge` implements `IAgentRunner` (same interface as `AgentRunner`):

```typescript
// src/agents/core/WebhookBridge.ts

export class WebhookBridge implements IAgentRunner {
  constructor(
    config: AgentConfig,
    perception: IPerceptionEngine,
    skills: ISkillRegistry,
    memory: IAgentMemory,
    getContext: RunContextProvider,
    webhookUrl: string,              // e.g. http://localhost:3001/webhook
    webhookToken: string,            // Bearer token for auth
  )

  async run(event: AgentEvent): Promise<AgentRunResult>
}
```

### `run()` Flow

1. Get `RunContext` via `this.getContext(event)` — **unchanged**
2. Generate `PerceptionSnapshot` via `this.perception.generateSnapshot()` — **unchanged**
3. Get recent memory via `this.memory.getRecentContext(2000)` — **unchanged**
4. Build webhook payload (see schema below)
5. `POST` to `this.webhookUrl` with `Authorization: Bearer ${this.webhookToken}`
6. Parse response as action list
7. **Validate**: each `action.skill` must be in `this.config.skills` — reject unknown skills
8. Execute each action via `this.skills.executeSkill(name, params, gameContext)` — **unchanged**
9. Store assistant text in memory — **unchanged**
10. Return `AgentRunResult`

### Webhook Request Schema

```typescript
interface OpenClawWebhookRequest {
  agent_id: string;                    // e.g. "elder-theron"
  event: {
    type: AgentEventType;              // 'player_action' | 'idle_tick' | etc.
    timestamp: number;
    player?: {
      id: string;
      name: string;
      position: { x: number; y: number };
    };
  };
  perception: {
    summary: string;                   // "You are in simplemap. A player named Alex is 3 tiles east."
    entities: NearbyEntity[];
    location: PerceptionLocation;
  };
  memory: Array<{
    role: string;
    content: string;
  }>;
  available_skills: string[];          // ['say', 'move', 'look', 'emote', 'wait']
}
```

### Webhook Response Schema

```typescript
interface OpenClawWebhookResponse {
  text?: string;                       // Optional assistant text (for memory/logging)
  actions: Array<{
    skill: string;                     // Must be in available_skills
    params: Record<string, unknown>;   // Skill-specific parameters
  }>;
  metadata?: {
    model?: string;
    tokens?: { input: number; output: number };
    duration_ms?: number;
  };
}
```

### Error Handling

| Scenario | Behavior |
|----------|----------|
| HTTP timeout (5s default) | Return safe fallback `{skill: "wait", params: {duration: 2000}}` |
| Non-2xx response | Log error, return failed `AgentRunResult`, NPC does nothing |
| Invalid response schema | Log warning, skip malformed actions |
| OpenClaw down | NPC stays idle, does not crash game server |
| Unknown skill in response | Log + skip that action, execute remaining valid actions |

Matches existing `AgentRunner` try/catch pattern (lines 258-270 in AgentRunner.ts).

---

## 5. Custom SKILL.md Files for Game Actions

Each game skill gets a corresponding SKILL.md installed in the OpenClaw agent. These teach OpenClaw what game actions it can request. They are NOT executed by OpenClaw — they are schema/documentation the agent uses to format webhook responses correctly.

| SKILL.md | Maps to | Parameters |
|----------|---------|------------|
| `rpg-say.md` | `say` skill | `message` (string, required), `target` (string), `mode` (modal/bubble) |
| `rpg-move.md` | `move` skill | `direction` (up/down/left/right, required) |
| `rpg-look.md` | `look` skill | (none) |
| `rpg-emote.md` | `emote` skill | `emotion` (happy/sad/angry/confused, required) |
| `rpg-wait.md` | `wait` skill | `duration` (number, ms) |
| `rpg-generate-image.md` | `generate_image` skill | `prompt` (string, required) |

**Location:** Version-controlled in `Open-RPG/openclaw/skills/`, deployed to OpenClaw agent skill directory.

**Format:** Each follows OpenClaw SKILL.md standard with YAML frontmatter:
```yaml
---
name: rpg-say
description: Speak to a nearby player in the RPG game world
---
```

Parameter schemas MUST match existing skill definitions in `src/agents/skills/skills/*.ts` exactly.

---

## 6. NPC-to-OpenClaw Agent Mapping

Each NPC that runs in OpenClaw mode has a corresponding OpenClaw agent:

| AgentConfig field | OpenClaw Agent equivalent |
|-------------------|--------------------------|
| `personality` | Agent system prompt / identity |
| `model.conversation` | Model selection (Kimi K2.5) |
| `model.idle` | Model for idle events (cheaper model) |
| `skills` | Which SKILL.md files are loaded |
| `behavior` | Custom instructions in system prompt |
| `name` | Agent display name in Kimi Claw |
| `id` | Maps to webhook match rule |

**Setup per NPC in Kimi Claw:**
1. Create agent with personality as system prompt
2. Load relevant SKILL.md files (rpg-say, rpg-move, etc.)
3. Configure webhook endpoint
4. Set match rule routing by `agent_id`
5. Set model: Kimi K2.5 for conversation, K2 for idle
6. Enable — agent starts receiving webhook POSTs

---

## 7. Migration 014 — OpenClaw Agent Mode

```sql
-- 014_openclaw_agent_mode.sql

ALTER TABLE game.agent_configs
  ADD COLUMN agent_mode text NOT NULL DEFAULT 'in-process'
    CHECK (agent_mode IN ('in-process', 'openclaw')),
  ADD COLUMN openclaw_agent_id text,
  ADD COLUMN openclaw_webhook_url text;

COMMENT ON COLUMN game.agent_configs.agent_mode IS
  'How this NPC''s brain runs: in-process (AgentRunner + LLMClient) or openclaw (WebhookBridge to local OpenClaw)';
COMMENT ON COLUMN game.agent_configs.openclaw_agent_id IS
  'OpenClaw agent identifier in Kimi Claw. NULL for in-process NPCs.';
COMMENT ON COLUMN game.agent_configs.openclaw_webhook_url IS
  'Override webhook URL for this NPC. NULL uses default from OPENCLAW_WEBHOOK_URL env var.';
```

**Impact:**
- `rowToAgentConfig()` in AgentManager.ts parses new columns
- `AgentConfig` interface gets three new optional fields
- `AgentManager.registerAgent()` checks `agent_mode` to instantiate `WebhookBridge` or `AgentRunner`
- All existing NPCs default to `agent_mode = 'in-process'` — zero behavior change

---

## 8. End-to-End Data Flow — Both Modes

### In-Process Mode (unchanged)

```
Player presses action
  → GameChannelAdapter.onPlayerAction()     [bridge/GameChannelAdapter.ts:107]
  → buildAgentEvent('player_action', player) [bridge/GameChannelAdapter.ts:42]
  → laneQueue.enqueue(agentId, task)        [bridge/GameChannelAdapter.ts:153]
  → AgentRunner.run(event)                  [core/AgentRunner.ts:112]
    → getContext(event) → RunContext
    → perception.generateSnapshot(ctx)
    → buildSystemPrompt(snapshot)
    → llmClient.complete(messages, tools)   → Moonshot Kimi API
    → [tool loop: up to 5 iterations]
    → memory.addMessage(response)
  → AgentRunResult
  → Skills already executed during tool loop
```

### OpenClaw Mode (new)

```
Player presses action
  → GameChannelAdapter.onPlayerAction()     [UNCHANGED]
  → buildAgentEvent('player_action', player) [UNCHANGED]
  → laneQueue.enqueue(agentId, task)        [UNCHANGED]
  → WebhookBridge.run(event)               [NEW: core/WebhookBridge.ts]
    → getContext(event) → RunContext        [UNCHANGED]
    → perception.generateSnapshot(ctx)      [UNCHANGED]
    → memory.getRecentContext(2000)          [UNCHANGED]
    → HTTP POST to OpenClaw: {event, perception, memory, available_skills}
    → OpenClaw thinks (Kimi K2.5 + SKILL.md)
    → Response: {text, actions: [{skill, params}]}
    → FOR EACH action: skills.executeSkill() [UNCHANGED]
    → memory.addMessage(response.text)       [UNCHANGED]
  → AgentRunResult
  → RPGJS renders                           [UNCHANGED]
```

---

## 9. Latency Analysis

| Metric | In-Process | OpenClaw (local) | Notes |
|--------|-----------|------------------|-------|
| Event capture | ~1ms | ~1ms | GameChannelAdapter, identical |
| Perception generation | ~2ms | ~2ms | PerceptionEngine, identical |
| LLM round-trip | 1-3s | 1-3s | Same API (Kimi K2.5), same models |
| Webhook overhead | N/A | ~10-50ms | localhost HTTP POST |
| Skill execution | ~5-50ms | ~5-50ms | In-process, identical |
| **Total typical** | **1-3s** | **1-3.1s** | **Negligible difference** |

The webhook overhead is negligible compared to LLM latency. Local OpenClaw means `localhost` — no network hop.

---

## 10. Security — ClawHavoc Mitigation

The [ClawHavoc incident](https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface) (Feb 2026) revealed 341 malicious skills on ClawHub that exfiltrated data and performed unauthorized actions.

**Our mitigations:**

1. **No untrusted ClawHub skills on game NPCs.** We write all 6 SKILL.md files ourselves. Only our custom RPG skills are loaded.
2. **Webhook authentication.** Every webhook request includes a Bearer token. OpenClaw verifies before processing. Token set via `OPENCLAW_WEBHOOK_TOKEN` env var.
3. **Response validation.** WebhookBridge validates before executing:
   - `actions[].skill` must be in `config.skills` (NPC's allowed list)
   - Parameters validated by SkillRegistry's existing validation
   - Unknown skills logged and skipped
4. **No secrets in webhook payloads.** Only perception data, memory context, and event info. No API keys, no Supabase credentials.
5. **ClawHub skills for non-game use only.** External ClawHub skills (web search, image gen) run inside OpenClaw and never touch the game server. Game server only receives action responses mapping to its 6 known skills.

---

## 11. Cost Analysis

| Item | Current | Proposed | Delta |
|------|---------|----------|-------|
| LLM API (Kimi K2.5) | $0.60/M input, $3.00/M output | Same (routed through OpenClaw) | No change |
| Idle model (K2) | ~$0.30/M input | Same | No change |
| OpenClaw runtime | N/A | Free (open-source, runs locally) | $0/mo |
| Kimi Claw UI | N/A | Free (BYOC mode) | $0/mo |
| Game server | Railway hosting | Same + local OpenClaw process | Minimal |
| **Dev savings** | Building workflow engine, credentials, execution history | Eliminated (Kimi Claw provides) | **~40-60 dev hours saved** |

**Bottom line:** Same operational cost, significant development savings.

---

## 12. Sprint Impact

### Unchanged (body-side, proceed as planned)

| Task | Status | Why unchanged |
|------|--------|---------------|
| G-3 Content Store + Tagging | UNBLOCKED | Content in Supabase regardless of brain location |
| G-4 Social Feed | Blocked by G-3 | Reads from content store — body-side |
| S-5 Feed UI | Blocked by G-4 | Studio reads game tables — body-side |
| G-7 Builder persistence | TODO | Writes to map_entities — body-side |
| G-8 Event config form | Blocked by G-7 | In-game form — body-side |
| S-4 Memory Viewer | TODO | Reads agent_memory — body-side |
| S-6 Map Entity Browser | TODO | Reads map_entities — body-side |
| D-4 Grant audit | TODO | Infrastructure task |

### Deprioritized (replaced by Kimi Claw)

| Studio Feature | Lines | Replacement |
|---------------|-------|-------------|
| WorkflowEditorPage.tsx | ~1,044 | Kimi Claw agent config UI |
| WorkflowList.tsx | ~200 | Kimi Claw agent list |
| Credentials.tsx | ~150 | OpenClaw manages secrets |
| ExecutionHistory.tsx | ~150 | Kimi Claw execution logs |
| AgentLibrary.tsx | ~100 | ClawHub skill marketplace |
| Canvas components (6+ files) | ~500+ | Kimi Claw visual builder |
| **Total** | **~2,100+** | |

### New Tasks (Wave 4)

| Task | Owner | Depends | Estimate |
|------|-------|---------|----------|
| OC-1 BYOC Setup | Human/Ops | — | 2-4 hours |
| OC-2 Webhook Bridge | Cursor | OC-1 | 4-6 hours |
| OC-3 SKILL.md Files | Cursor | OC-1 | 2-3 hours |
| OC-4 Config Schema (Migration 014) | Cursor | OC-2, OC-3 | 3-4 hours |
| OC-5 Studio Integration | Lovable | OC-4 | 3-4 hours |

---

## 13. Phased Migration Plan

### Phase 0 — Setup (OC-1)
Install OpenClaw locally. Connect to Kimi Claw (BYOC). Create test agent. Verify webhook. No code changes.

### Phase 1 — Bridge + First NPC (OC-2, OC-3, parallel)
Write `WebhookBridge.ts`. Write SKILL.md files. Configure Elder Theron as OpenClaw agent. Test end-to-end. All other NPCs remain in-process.

### Phase 2 — Config Schema (OC-4)
Migration 014. Update `AgentManager` mode check. Update `AgentConfig` interface. NPCs switchable between modes via Supabase row edits.

### Phase 3 — Studio Integration (OC-5)
NPC Builder gets "Agent Mode" toggle. OpenClaw fields appear conditionally. Dashboard shows mode per NPC. Link-out to Kimi Claw UI.

### Phase 4 — Full Migration (post-sprint)
Migrate remaining NPCs to OpenClaw. In-process mode remains as fallback (offline dev, testing).

**Key constraint:** All existing NPCs continue to work unchanged in in-process mode. No NPC is forcibly migrated. `agent_mode` defaults to `'in-process'`.

---

## Sources

- [Moonshot AI Launches Kimi Claw](https://www.marktechpost.com/2026/02/15/moonshot-ai-launches-kimi-claw-native-openclaw-on-kimi-com-with-5000-community-skills-and-40gb-cloud-storage-now/)
- [OpenClaw Skills Documentation](https://docs.openclaw.ai/tools/skills)
- [ClawHub Skill Registry](https://github.com/openclaw/clawhub)
- [Kimi K2.5 Pricing & Analysis](https://artificialanalysis.ai/models/kimi-k2-5)
- [Tools, Skills & MCP Guide](https://www.getopenclaw.ai/help/tools-skills-mcp-guide)
- [ClawHavoc Security Incident](https://1password.com/blog/from-magic-to-malware-how-openclaws-agent-skills-become-an-attack-surface)
- [OpenClaw + Kimi K2.5 Guide](https://www.aifreeapi.com/en/posts/openclaw-kimi-k2-guide)
- [How to Connect Kimi K2.5 to OpenClaw](https://platform.moonshot.ai/docs/guide/use-kimi-in-openclaw)
