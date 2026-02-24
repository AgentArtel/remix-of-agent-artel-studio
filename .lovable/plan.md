

# Fix Agent Builder Layout — Remove Overlapping Sections

## Problem

The right panel uses flex-grow ratios (`flex-[3]`, `flex-[5]`, `flex-[12]`) to divide vertical space between Artels, Studio Agents, Glasses Agents, Game Agents, and Config Panel. This causes sections to overlap and compress when the content exceeds the viewport height. The `auto-rows-fr` on grids also forces rows to fill available flex space, creating inconsistent card sizes.

## Solution

Replace the flex-grow ratio layout with a scrollable column where each section takes its natural height. The config panel at the bottom gets a fixed minimum height so it remains usable.

### File: `src/pages/AgentBuilder.tsx`

**Right panel container** (line 208): Change from flex-grow children to a scrollable column:
- Replace `flex-1 flex flex-col gap-4 min-w-0` with `flex-1 overflow-y-auto space-y-6 min-w-0`

**Each agent section** (Artels, Studio, Glasses, Game): Remove flex-grow ratios and let content size naturally:
- Remove `flex-[3]`, `flex-[5]` classes and `flex flex-col min-h-0`
- Replace `auto-rows-fr` with `auto-rows-auto` on all grids so cards have consistent height
- Remove `flex-1` from inner grids — they should not stretch

**Config Panel** (line 334): Give it a sensible minimum height instead of `flex-[12]`:
- Replace `flex-[12] overflow-y-auto min-h-0` with `min-h-[300px]`

**Left chat panel** (line 185): Remove the fixed `min-h-[600px]` — let it match the right panel's height via the parent flex container. Use `h-[calc(100vh-140px)] sticky top-6` so it stays visible while the right side scrolls.

These changes ensure:
- Each section renders at its natural content height
- Agent cards are uniform size across all sections
- The page scrolls vertically when content overflows
- The chat panel stays pinned while scrolling through agents
- No overlapping or compression

