

# Route Lorekeeper Through PicoClaw Bridge

## Problem

The Lorekeeper (`picoclaw_agents.picoclaw_agent_id = 'the-lorekeeper'`) has `deployment_status: 'running'` but `agent_config_id: null`. The `npc-ai-chat` edge function only looks up PicoClaw agents by `agent_config_id`, so the Lorekeeper **never routes through PicoClaw** -- it always falls back to raw Gemini API calls.

This means the Lorekeeper doesn't benefit from PicoClaw's skill execution, workspace files (SOUL.md, IDENTITY.md), or tool-calling capabilities.

## Solution

Update `LorekeeperChat.tsx` to call `picoclaw-bridge` (action: `chat`) instead of `npc-ai-chat`. The bridge already has proper PicoClaw routing, timeout handling, and session management.

Keep `npc-ai-chat` as-is for game NPCs that may or may not have PicoClaw backing. Add a fallback: if PicoClaw is unreachable, fall back to calling `npc-ai-chat` so the Lorekeeper still works without PicoClaw running.

## Changes

### 1. `src/components/lore/LorekeeperChat.tsx`

**Update `sendMessage` function:**
- Primary path: call `picoclaw-bridge` with `{ action: 'chat', agentId: agent.id, message, sessionId }` using the agent's Supabase UUID
- Fallback path: if bridge returns an error (PicoClaw unreachable), fall back to current `npc-ai-chat` call so the Lorekeeper still responds
- Save memory client-side after a successful bridge response (the bridge doesn't persist to `agent_memory` automatically)

**Update `handleMapWorld` function:**
- Same pattern: try `picoclaw-bridge` first, fall back to `npc-ai-chat`
- The "Map World" prompt needs the full lore context appended, which works the same way regardless of routing

**Keep existing:**
- History loading from `agent_memory` (unchanged)
- Agent config fetch from `picoclaw_agents` (unchanged, but now we use `agent.id` for the bridge call)
- Knowledge graph parsing (unchanged)

### 2. `src/lib/memoryService.ts`

**Add a `saveMemory` helper** (or verify one exists) so the chat component can persist messages after a successful bridge response. The bridge's `chat` action doesn't write to `agent_memory` -- only `npc-ai-chat` does that.

## Technical Details

Current flow:
```text
LorekeeperChat -> npc-ai-chat -> (PicoClaw lookup misses) -> raw Gemini API
```

New flow:
```text
LorekeeperChat -> picoclaw-bridge (chat action) -> PicoClaw gateway -> agent response
                  |-- on error: fallback to npc-ai-chat -> raw Gemini API
```

The bridge call format:
```typescript
await supabase.functions.invoke('picoclaw-bridge', {
  body: {
    action: 'chat',
    agentId: agentConfig.id,  // Supabase UUID
    message: messageText,
    sessionId: SESSION_ID,
  }
});
```

Memory persistence after bridge success:
```typescript
// Bridge doesn't save to agent_memory, so we do it client-side
await saveMemory(LOREKEEPER_NPC_ID, SESSION_ID, 'user', messageText);
await saveMemory(LOREKEEPER_NPC_ID, SESSION_ID, 'assistant', responseText);
```

## Files

| File | Action | What Changes |
|------|--------|-------------|
| `src/components/lore/LorekeeperChat.tsx` | Edit | Route through `picoclaw-bridge` with `npc-ai-chat` fallback |
| `src/lib/memoryService.ts` | Edit (if needed) | Add `saveMemory` helper for persisting messages after bridge calls |

No database changes. No new dependencies. No edge function changes needed -- both `picoclaw-bridge` and `npc-ai-chat` are already deployed.

