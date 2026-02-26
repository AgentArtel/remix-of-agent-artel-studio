

# What I Can Handle from This Plan

## In Scope (Lovable)

**1. Add `agent_config` action to `picoclaw-bridge` Edge Function** — this is the core backend piece everything else depends on.

- New `handleAgentConfig` function in `supabase/functions/picoclaw-bridge/index.ts`
- Uses the same UUID-vs-slug resolution pattern already in `handleChat` and `handleMemory`
- Queries `picoclaw_agents` for: `picoclaw_agent_id`, `soul_md`, `identity_md`, `llm_backend`, `llm_model`, `deployment_status`, `agent_type`, `temperature`, `max_tokens`, `fallback_models`
- Returns a flat response object matching the spec
- `AGENT_NOT_FOUND` error if no match
- Add `'agent_config'` case to the main switch statement

**2. Sidebar nav update** — move Agents link if needed (marked for Lovable in the plan).

## Out of Scope (Cursor / ClawLens project)

These files live in the ClawLens dashboard, a separate codebase:
- `src/lib/studio-api.ts` — ClawLens HTTP client
- `src/types/picoclaw.ts` — ClawLens type definitions
- `src/hooks/use-picoclaw-agents.ts`, `use-agent-memory.ts`, `use-agent-knowledge.ts` — ClawLens hooks
- `src/pages/AgentManagement.tsx` — ClawLens Agent Viewer page
- `.env` / `.env.example` — ClawLens env vars

## Implementation Detail

**`handleAgentConfig` in picoclaw-bridge:**

```text
Request:  { action: "agent_config", agentId: "the-chronicler-of-echoes" }
Response: { success: true, data: { picoclaw_agent_id, soul_md, identity_md, llm_backend, llm_model, deployment_status, agent_type, temperature, max_tokens, fallback_models } }
```

- Reuses the `isUuid` check + `.or()` query pattern from `handleChat`
- Read-only, no writes
- ~30 lines of new code added to the existing edge function

