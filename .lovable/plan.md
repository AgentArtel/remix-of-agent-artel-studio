
# Studio Dashboard: Skills Manager + Architecture Tabs + Task Brief

## Overview

Add two new tabs to the Studio Dashboard and generate a task brief for Claude Code. The Dashboard gets a tabbed layout with:

1. **Overview** -- The existing dashboard content (stats, workflows, activity)
2. **Skills** -- Full CRUD interface for PicoClaw agent skills
3. **Architecture** -- Visual flow diagram of the skill execution system + edge function registry

A task brief file is also created explaining what was built and what Claude Code needs to implement on the backend (edge function tool execution loop, tool handlers, etc.).

## Changes

### 1. Restructure `src/pages/Dashboard.tsx`

Wrap existing content in a `Tabs` component with three tabs: Overview, Skills, Architecture. The header and tab bar sit at the top; tab content renders below.

### 2. New: `src/components/dashboard/SkillsManager.tsx`

Full CRUD interface for `picoclaw_skills` table:

- **Card grid** showing all 7 existing skills with: name, slug, category badge (color-coded), tool names as chips, builtin badge, agent usage count, edit/delete actions
- **Create/Edit dialog** with fields: name, slug, description, category (select from: core, analysis, creative, developer, research), skill_md (textarea), tools (comma-separated input parsed to JSON array), is_builtin toggle
- **Delete confirmation** dialog that checks for agent assignments first
- Uses existing `usePicoClawSkills()` query hook
- Adds `useCreateSkill`, `useUpdateSkill`, `useDeleteSkill` mutations

### 3. New: `src/components/dashboard/ArchitectureView.tsx`

Static documentation/visualization page with two sections:

**Section A: Skill Execution Flow**
A styled HTML/CSS vertical flow diagram showing:
- User Message -> npc-ai-chat -> Load Agent Skills -> Build Tool Schemas -> Call LLM with Tools -> Tool Call? -> Execute Handler -> Loop back -> Final Response -> Return to Client
- Each step is a styled card/node connected by arrows, using the project's dark theme

**Section B: Edge Functions Registry**
Cards for all 16 deployed edge functions grouped by category:
- **AI** (6): gemini-chat, gemini-embed, gemini-vision, kimi-chat, npc-ai-chat, generate-image
- **Game** (3): object-action, object-api, picoclaw-bridge
- **Lore** (3): decipher-fragment, embed-lore, extract-lore-text
- **Studio** (4): studio-run, workflow-scheduler, manage-credential, execute-http

Each card shows: function name, brief description, category badge, deployed status indicator

### 4. Update `src/hooks/usePicoClawAgents.ts`

Add three new mutation hooks:

- `useCreateSkill()` -- Insert into `picoclaw_skills`, invalidates `SKILLS_KEY`
- `useUpdateSkill()` -- Update by ID, invalidates `SKILLS_KEY`
- `useDeleteSkill()` -- Delete by ID (after checking `picoclaw_agent_skills` for assignments), invalidates `SKILLS_KEY`

Also add a query hook `useSkillAgentCounts()` that queries `picoclaw_agent_skills` grouped by `skill_id` to show how many agents use each skill.

### 5. New: `tasks/claude-code/TASK-studio-skills-architecture.md`

A task brief for Claude Code explaining:

- **What was built**: Skills Manager UI (CRUD for `picoclaw_skills`), Architecture visualization, Dashboard tabs
- **What Claude Code needs to do**:
  - Implement the actual tool execution loop in `npc-ai-chat/index.ts` (dynamic skill loading, tool schema building, tool call handling)
  - Create tool handler modules in `supabase/functions/_shared/tool-handlers/`
  - Implement handlers for: memory (recall/store via `agent_memory`), sentiment (via Lovable AI Gateway), image generation (via `generate-image` function), web search
  - Add a `tool_schemas` JSONB column to `picoclaw_skills` (optional, or use code registry)
  - Wire the execution loop so LLM tool calls are executed and results fed back
- **Available infrastructure**: Lovable AI Gateway URL + key, existing edge functions, existing DB schema
- **Testing instructions**: How to verify skills work end-to-end

## Technical Details

### Files Created
- `src/components/dashboard/SkillsManager.tsx`
- `src/components/dashboard/ArchitectureView.tsx`
- `tasks/claude-code/TASK-studio-skills-architecture.md`

### Files Modified
- `src/pages/Dashboard.tsx` -- Add Tabs wrapper
- `src/hooks/usePicoClawAgents.ts` -- Add skill CRUD mutations + skill agent counts query

### No Database Changes Required
All CRUD operates on the existing `picoclaw_skills` and `picoclaw_agent_skills` tables.

### Architecture Diagram Layout
The flow diagram uses styled div cards with CSS arrows/connectors in a vertical layout. Each node has an icon, title, and brief description. The "tool execution loop" is shown as a highlighted feedback arrow. Colors follow the project's green accent theme.

### Skills Manager Category Colors
- core: green
- analysis: blue
- creative: purple
- developer: amber
- research: cyan
