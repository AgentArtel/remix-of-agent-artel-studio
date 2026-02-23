

# Two Changes: G1 Dashboard Navigation + Glasses Agent Type

## 1. Even G1 Dashboard — Add Back Navigation

**File: `src/pages/EvenG1Dashboard.tsx`**

Add a "Back to Dashboard" button in the header bar so users can return to the main app without relying on the sidebar (which is hidden in full-screen mode).

- Import `ArrowLeft` from lucide-react
- Add a clickable button before the title that calls `onNavigate('game-dashboard')`
- Styled consistently with the existing header

## 2. Glasses Agent Type — Database + Hooks + UI

The `agent_type` column on `picoclaw_agents` already stores `'game'` or `'studio'`. We extend this to also support `'glasses'`.

### 2a. Hook — New query for glasses agents

**File: `src/hooks/usePicoClawAgents.ts`**

- Add `useGlassesAgents()` query — same pattern as `useStudioAgents()` but filtering `agent_type = 'glasses'`
- Extend `CreateAgentInput.agent_type` union to `'game' | 'studio' | 'glasses'`

### 2b. AgentSlotCard — Support glasses type

**File: `src/components/agents/AgentSlotCard.tsx`**

- Extend `agentType` prop to `'game' | 'studio' | 'glasses'`
- Add glasses-specific styling: `Glasses` icon, cyan/teal accent color, "Glasses" badge
- Update empty slot text to "Create Glasses Agent" when type is `'glasses'`

### 2c. AgentBuilder — Add Glasses Agents section

**File: `src/pages/AgentBuilder.tsx`**

- Import `Glasses` icon and `useGlassesAgents` hook
- Extend `createAgentType` state to include `'glasses'`
- Add a new "Glasses Agents" grid section between Studio Agents and Game Agents, following the same pattern (header with icon, grid of `AgentSlotCard` with `agentType="glasses"`, empty slot to create)
- Include glasses agents in the `selectedAgent` lookup
- Determine `selectedAgentType` for glasses agents

### 2d. AgentFormModal — Support glasses type

**File: `src/components/agents/AgentFormModal.tsx`**

- Extend `agentType` prop type to include `'glasses'`
- The modal title should reflect "Glasses Agent" when creating/editing a glasses agent

## Technical Notes

- The `picoclaw_agents.agent_type` column is a `text` field with no enum constraint, so `'glasses'` values can be inserted without a migration
- The `useCreateAgent` mutation already passes `agent_type` from the input, so creating glasses agents works out of the box once the type is extended
- No database migration required

