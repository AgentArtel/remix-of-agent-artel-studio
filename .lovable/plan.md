

# Architecture Visualizer: Canvas-Powered Interactive Diagrams

## The Idea

Replace the current static HTML flow diagram on the Architecture page with the **existing Canvas component** — the same one used in the Workflow Editor. This turns the architecture documentation into an interactive, zoomable, pannable diagram that reuses 100% of the existing canvas infrastructure.

## What Changes

### 1. New Component: `src/components/dashboard/ArchitectureCanvas.tsx`

A read-only canvas view that renders the skill execution flow as actual `CanvasNode` components connected by `ConnectionLine` components. It reuses:

- `Canvas` (pan, zoom, grid, minimap)
- `CanvasNode` (node rendering with icons, status, ports)
- `ConnectionLine` (bezier curves with glow/animation)

The flow steps become pre-positioned `NodeData[]` objects:

```text
Node: "User Message"        (type: trigger,    position: {x: 400, y: 50})
Node: "npc-ai-chat"         (type: webhook,    position: {x: 400, y: 200})
Node: "Load Agent Skills"   (type: memory,     position: {x: 400, y: 350})
Node: "Build Tool Schemas"  (type: code-tool,  position: {x: 400, y: 500})
Node: "Call LLM"            (type: ai-agent,   position: {x: 400, y: 650})
Node: "Execute Tool"        (type: http-tool,  position: {x: 700, y: 650})
Node: "Final Response"      (type: trigger,    position: {x: 400, y: 850})
```

Connections are pre-defined `Connection[]` objects linking them top-to-bottom, with a loop-back connection from "Execute Tool" back to "Call LLM" shown as an animated connection.

### 2. Update `src/components/dashboard/ArchitectureView.tsx`

Replace the `SkillExecutionFlow` section (the static HTML cards + arrows) with `ArchitectureCanvas`. The Edge Functions Registry section on the right stays as-is — it works well as a card list.

The layout becomes:
- **Left/Top**: Interactive canvas diagram (takes more space, roughly 60% on large screens)
- **Right/Bottom**: Edge Functions Registry (card list, same as now)

### 3. Read-Only Canvas Mode

The `ArchitectureCanvas` component passes no-op handlers for `onNodeMove`, `onConnectionStart`, `onConnectionEnd` — making the canvas view-only. Users can still:
- Pan around the diagram
- Zoom in/out with scroll wheel or controls
- Use the minimap to navigate
- Click nodes to see a tooltip/info panel about that step

No dragging, no editing, no connection drawing.

### 4. Animated Execution Flow (bonus)

Since `ConnectionLine` already supports `isAnimating` (dashed flowing lines), we can set the tool-execution loop connections to animate continuously, visually showing the "data flows in a loop" concept. This makes the architecture diagram feel alive.

### 5. Optional: Clickable Nodes with Info Panel

When a user clicks a node on the architecture canvas, show a small info popover or side detail explaining that step in more depth (e.g., clicking "npc-ai-chat" shows which DB tables it reads, what env vars it needs, etc.). This reuses the `ConfigPanel` pattern but in read-only mode.

## Why This Approach

- **Zero new rendering code** — Canvas, CanvasNode, ConnectionLine already exist and are battle-tested
- **Consistent visual language** — Architecture diagrams look identical to actual workflows
- **Interactive** — Pan, zoom, minimap vs. static HTML
- **Animated connections** — The loop-back arrow animates, showing the execution cycle
- **Extensible** — Can add more diagrams later (e.g., lore pipeline, game event flow) using the same pattern
- **Familiar to users** — If they've used the Workflow Editor, the architecture diagram feels natural

## Technical Details

### Files Modified
- `src/components/dashboard/ArchitectureView.tsx` — Replace `SkillExecutionFlow` with `ArchitectureCanvas`

### Files Created
- `src/components/dashboard/ArchitectureCanvas.tsx` — Pre-configured read-only canvas with hardcoded architecture nodes and connections

### No Database Changes

All data is hardcoded in the component (architecture documentation, not user data).

### Architecture Nodes Definition

The component defines a constant array of `NodeData` and `Connection` objects that represent the skill execution flow. Each node maps to an existing `NodeType` for proper icon/color rendering:

- `trigger` type for entry/exit points (green icon)
- `webhook` type for the edge function (orange icon)
- `memory` type for DB queries (purple icon)
- `code-tool` type for schema building (yellow icon)
- `ai-agent` type for the LLM call (green icon)
- `http-tool` type for tool execution (cyan icon)

### Connection Animation

The loop-back connections (Execute Tool -> Call LLM) use `animated: true` on the `Connection` object, which triggers the dashed flowing line effect already built into `ConnectionLine`.

### Fit-to-View on Load

The canvas auto-calls `fitToView` on mount so the entire diagram is visible without manual zooming — leveraging the existing `handleFitToView` logic in `Canvas`.

