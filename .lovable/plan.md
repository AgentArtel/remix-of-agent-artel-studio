

# Add Studio Agents Section to Agent Builder Page

## What Changes

The Agent Builder page currently only shows game agents. We'll add a new **"Studio Agents"** section above the game agents grid that displays internal/studio agents (like the Lorekeeper). These are persistent utility agents that serve Studio functions rather than being game NPCs.

---

## 1. New Hook: `useStudioAgents`

Add a new query function in `usePicoClawAgents.ts` that fetches agents where `agent_type = 'studio'`:

```typescript
export function useStudioAgents() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'studio'],
    queryFn: async (): Promise<PicoClawAgent[]> => {
      const { data, error } = await supabase
        .from('picoclaw_agents')
        .select('*')
        .filter('agent_type', 'eq', 'studio')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as PicoClawAgent[]) || [];
    },
  });
}
```

## 2. Update AgentSlotCard

Add visual differentiation for studio agents:
- Show a different icon (e.g. `Sparkles` or `BookOpen`) instead of `Bot` for studio-type agents
- Show a subtle "Studio" badge/label
- Accept an optional `agentType` prop to determine styling

## 3. Update AgentBuilder Page

Add a new section between Artels and Individual Agents:

```
Agent Artels (existing)
Studio Agents (NEW) -- shows the Lorekeeper and any future studio agents
Game Agents (existing, renamed from "Individual Agents")
Config Panel (existing)
```

The Studio Agents section will:
- Use `useStudioAgents()` to fetch studio agents
- Display them in a horizontal row (similar to artels but with agent cards)
- Clicking a studio agent selects it and shows its detail panel / chat
- Include an empty slot with "Create Studio Agent" that opens the create modal with `agent_type` pre-set to `studio`

## 4. Update Create Agent Flow

When creating from the Studio Agents section:
- Pass `agent_type: 'studio'` in the `CreateAgentInput`
- The Game Link tab in `AgentFormModal` should be hidden when `agent_type = 'studio'` (studio agents don't link to game entities)

## 5. Update CreateAgentInput Type

Add `agent_type` to the `CreateAgentInput` type so it can be passed during creation:

```typescript
export type CreateAgentInput = {
  picoclaw_agent_id: string;
  agent_type?: 'game' | 'studio';
  // ... rest unchanged
};
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/usePicoClawAgents.ts` | Add `useStudioAgents()` hook, add `agent_type` to `CreateAgentInput` |
| `src/components/agents/AgentSlotCard.tsx` | Add `agentType` prop for visual differentiation (icon, badge) |
| `src/pages/AgentBuilder.tsx` | Add Studio Agents section, wire up `useStudioAgents`, handle studio agent creation |
| `src/components/agents/AgentFormModal.tsx` | Hide Game Link tab when `agent_type = 'studio'` |
