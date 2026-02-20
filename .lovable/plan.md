

# Chat-First Bento Layout for Agent Builder

## Layout Overview

The page will be restructured into a two-panel layout: a compact agent sidebar on the left and a large chat panel taking the main area. Clicking an agent selects it and opens chat. All agent actions (edit, deploy, stop, delete) are accessible inline.

```text
+---------------------------+----------------------------------------------+
| AGENTS (left panel ~280px)|  CHAT (main area, flex-1)                    |
|                           |                                              |
| [+ Create Agent]          |  Header: Agent name + status + actions       |
|                           |  (Edit / Deploy / Stop / Delete)             |
| > Chad the Shredder  [*]  |                                              |
|   gemini/2.5-flash        |  +------------------------------------------+|
|   Running                 |  |                                          ||
|                           |  |  Chat messages area (scrollable)         ||
| > test-bot           [ ]  |  |                                          ||
|   groq/llama-3.3         |  |                                          ||
|   Draft                   |  |                                          ||
|                           |  +------------------------------------------+|
|                           |  [ Type a message...              ] [Send]   |
+---------------------------+----------------------------------------------+
```

## Changes

### 1. New component: `AgentListItem` (`src/components/agents/AgentListItem.tsx`)

A compact row component replacing the large `AgentCard` in this view. Shows:
- Bot icon, agent name, model info on one line
- Status dot/label
- Highlighted border when selected (active agent)
- Click to select (opens chat)

### 2. Refactor `AgentChatTest` (`src/components/agents/AgentChatTest.tsx`)

- Remove the fixed `h-[400px]` -- make it `h-full` so it fills the main content area
- Add a richer header bar with:
  - Agent name and status badge
  - Inline action buttons: Edit, Deploy/Stop, Delete
- Clear messages when switching agents (reset on `agentId` change)
- Better empty state when no agent is selected vs. agent selected but no messages yet

### 3. Rewrite `AgentBuilder` page (`src/pages/AgentBuilder.tsx`)

Replace the current grid + side chat with the two-panel bento layout:
- Left panel (w-72, border-r): agent list with search and create button
- Main panel (flex-1): full-height `AgentChatTest` for the selected agent, or an empty state prompting to select/create one
- Remove the `AgentCard` import (no longer used on this page)
- `selectedAgentId` state replaces `testingAgentId`
- Auto-select first agent on load if none selected

### 4. Keep `AgentCard` unchanged

It may still be useful elsewhere (dashboard previews, etc.), so we won't delete it.

## Technical Details

**File: `src/components/agents/AgentListItem.tsx`** (new)
- Props: `agent` (PicoClawAgent), `isSelected`, `skillCount`, `onClick`
- Compact button element: icon + name + model + status dot
- Selected state: `bg-green/10 border-green/30`

**File: `src/components/agents/AgentChatTest.tsx`** (modify)
- Remove `h-[400px]`, use `h-full` for the outer container
- Accept new optional props: `status`, `llmBackend`, `llmModel`, `onEdit`, `onDeploy`, `onStop`, `onDelete`
- Add `useEffect` to reset messages when `agentId` changes
- Render action buttons in the header bar

**File: `src/pages/AgentBuilder.tsx`** (rewrite)
- Layout: `flex h-[calc(100vh-theme(spacing.16))]` (full height minus header)
- Left: `w-72 border-r border-white/5 flex flex-col` with search + scrollable agent list + create button
- Right: `flex-1` with the enhanced `AgentChatTest` or empty state
- State: `selectedAgentId` instead of `testingAgentId`
- Auto-select first agent on initial load

