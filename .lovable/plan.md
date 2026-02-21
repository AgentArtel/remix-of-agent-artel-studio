

# Split into Two Dashboards: Studio + Game Design

## Overview

Currently the app has a single Dashboard page that mixes Studio/workflow stats (active workflows, executions, success rate) with game stats (NPCs, player messages, online players). The sidebar also lumps everything together with status-based grouping (Live, Mock Data, Coming Soon).

This plan reorganizes the app into two clear contexts:
1. **Game Design Dashboard** -- the default landing page focused on game world creation (NPCs, lore, objects, maps)
2. **Studio Dashboard** -- focused on workflow automation, executions, and agent orchestration

The sidebar will be restructured from status-based groups into context-based groups.

---

## Changes

### 1. New Game Design Dashboard (`src/pages/GameDashboard.tsx`)

A new page focused on the game designer's perspective:
- **Stat cards**: Active NPCs, Lore Entries, Object Templates, Player Messages, Online Players
- **Quick actions**: Create NPC, Upload Lore, Open Play Game
- **Recent activity**: Latest NPC edits, lore uploads, fragment seals
- **World overview**: Summary cards linking to NPCs, World Lore, Objects, Map Browser
- Data pulled from `agent_configs`, `agent_memory`, `player_state`, `world_lore`, `object_templates`, `fragment_archive`

### 2. Refactor Existing Dashboard (`src/pages/Dashboard.tsx`)

Rename/rebrand as "Studio Dashboard":
- Remove the game stats section (NPCs, player messages, online players) -- those move to the Game Dashboard
- Keep workflow stats, execution chart, recent workflows, activity feed
- Update heading to "Studio Dashboard"

### 3. Sidebar Reorganization (`src/components/ui-custom/Sidebar.tsx`)

Replace the current Live/Mock Data/Coming Soon grouping with context-based groups:

```text
-- Game Design --
  Game Dashboard (new default)
  Play Game
  NPCs
  Objects
  World Lore
  Map Browser

-- Studio --
  Studio Dashboard
  Agents
  Workflows
  Workflow Editor
  Executions
  Ideas

-- System --
  Integrations
  Credentials
  Templates
  Settings
```

Coming Soon items (AI Map Agent, Game Scripts, Player Sessions) will be kept in a collapsed "Coming Soon" group or folded into the relevant context group with a badge.

### 4. Update App Navigation (`src/App.tsx`)

- Add `'game-dashboard'` to the `Page` type union
- Add route case for the new `GameDashboard` component
- Change the default page from `'dashboard'` to `'game-dashboard'`

---

## Technical Details

### New file
- `src/pages/GameDashboard.tsx` -- New React component with Supabase queries for game-specific stats

### Modified files
- `src/pages/Dashboard.tsx` -- Remove game stats section, update title to "Studio Dashboard"
- `src/components/ui-custom/Sidebar.tsx` -- Restructure `navGroups` from status-based to context-based grouping
- `src/App.tsx` -- Add `GameDashboard` import, new page case, update default page

### Data queries for Game Dashboard
- `agent_configs` (count enabled NPCs)
- `world_lore` (count entries, recent uploads)
- `fragment_archive` (count sealed fragments)
- `object_templates` (count templates)
- `player_state` (online players)
- `agent_memory` where role='user' (player messages)

All queries use the existing `supabase` client and `@tanstack/react-query` patterns already established in the codebase.

