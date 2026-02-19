

# Organize Sidebar into Collapsible Dev-Status Groups

## Overview
Reorganize the flat 17-item sidebar into collapsible groups based on development status, making it easy to focus on what's wired up vs. what's still placeholder.

## Groups

### Live (data-driven, wired to Supabase)
- Play Game
- NPCs
- Objects
- Integrations
- Dashboard

### Mock Data (UI works, static/mock data)
- Ideas
- Workflows
- Workflow Editor
- Executions
- Credentials
- Templates
- Map Browser
- Components (Showcase)

### Coming Soon (placeholder pages)
- AI Map Agent
- Game Scripts
- Player Sessions

### Always visible (bottom, no group)
- Settings

## How It Works
- Each group gets a label header (e.g. "Live", "Mock Data", "Coming Soon") with a chevron toggle
- Groups are collapsible using simple React state -- clicking the label toggles visibility of its items
- All groups default to open; state persists in component (no localStorage needed for dev tool)
- When sidebar is collapsed (icon-only mode), group headers hide and all items show as icons only (flat, like today)
- A small colored dot/badge on the group label indicates status at a glance (green = live, amber = mock, gray = coming soon)

## Technical Details

### Files to modify

1. **`src/components/ui-custom/Sidebar.tsx`**
   - Replace the flat `navItems` array with a grouped structure:
     ```
     const navGroups = [
       { label: 'Live', status: 'live', items: [...] },
       { label: 'Mock Data', status: 'mock', items: [...] },
       { label: 'Coming Soon', status: 'coming-soon', items: [...] },
     ]
     ```
   - Add `useState<Record<string, boolean>>` for group open/closed state (all default open)
   - Render each group with a clickable header row (label + chevron) and conditionally render items
   - Settings rendered separately at the bottom outside groups
   - When `isCollapsed`, skip group headers and render all items flat (icons only)
   - Add `ChevronDown` / `ChevronUp` icons for group toggle

2. **`src/components/ui-custom/SidebarItem.tsx`** -- No changes needed, works as-is.

### No new dependencies required
Uses existing Lucide icons and Tailwind classes.

