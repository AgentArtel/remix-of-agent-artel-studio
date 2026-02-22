# Architecture Diagram Template

> **For AI agents and contributors** — follow this guide to add new system diagrams to the Architecture page in Kimi RPG Studio.

## File to Edit

```
src/components/dashboard/architectureDiagrams.ts
```

All diagrams are defined in this single file. The UI (`ArchitectureView.tsx`) dynamically renders whatever is in the `SYSTEM_DIAGRAMS` array — no other files need changing.

---

## SystemDiagram Interface

```typescript
export interface SystemDiagram {
  id: string;              // Unique kebab-case identifier (e.g. 'npc-chat')
  title: string;           // Display title (e.g. 'NPC Chat Pipeline')
  description: string;     // 1-2 sentence description shown in sidebar
  icon: LucideIcon;        // Lucide icon component
  colorClass: string;      // Tailwind classes for icon styling (e.g. 'text-teal-400 bg-teal-500/20')
  category: 'Core' | 'Agents' | 'Content' | 'Game' | 'Infrastructure';
  nodes: NodeData[];        // Canvas nodes
  connections: Connection[]; // Lines between nodes
  edgeFunctions: string[];  // Edge functions used by this system
  tables: string[];         // Database tables used by this system
}
```

---

## Available Node Types

Each type maps to an icon and color in `CanvasNode.tsx`:

| Type | Icon | Color | Use For |
|------|------|-------|---------|
| `trigger` | MessageSquare | blue-400 | Entry/exit points, events |
| `webhook` | Webhook | orange-400 | Edge functions |
| `code-tool` | Code2 | yellow-400 | Logic, transforms, checks |
| `http-tool` | Globe | cyan-400 | External API calls |
| `memory` | Database | purple-400 | Database read/write |
| `ai-agent` | Bot | green | LLM agent nodes |
| `picoclaw-agent` | Bot | teal-400 | PicoClaw deployed agent |
| `game-show-text` | MessageSquare | amber-400 | Show text in game |
| `game-give-item` | Package | amber-400 | Give item to player |
| `game-give-gold` | Coins | amber-400 | Give gold to player |
| `game-teleport` | MapPin | amber-400 | Teleport player |
| `game-open-gui` | LayoutDashboard | amber-400 | Open game GUI |
| `game-set-variable` | Variable | amber-400 | Set game variable |
| `image-gen` | ImageIcon | pink-400 | Image generation |
| `openai-chat` | Sparkles | green | OpenAI chat node |
| `anthropic-chat` | Sparkles | green | Anthropic chat node |
| `gemini-chat` | MessageSquare | emerald-400 | Gemini chat |
| `gemini-embed` | Database | indigo-400 | Gemini embeddings |
| `gemini-vision` | Eye | amber-400 | Gemini vision |

---

## Positioning

Use the `row(col, rowIdx)` helper:

```typescript
function row(col: number, rowIdx: number): { x: number; y: number }
```

- **col** = horizontal position (0, 1, 2, ...)
- **rowIdx** = vertical position (0, 1, 2, ...)
- Gap between columns: `NODE_GAP_X = 280px`
- Gap between rows: `NODE_GAP_Y = 180px`

### Layout patterns

**Linear flow** (left to right):
```
row(0, 0) → row(1, 0) → row(2, 0) → row(3, 0)
```

**Branching** (fork at col 2):
```
row(0, 0) → row(1, 0) → row(2, 0)  ← branch A
                        → row(2, 1)  ← branch B
```

**Converging** (merge at col 4):
```
row(2, 0) → row(3, 0) ↘
                        → row(4, 0)
row(2, 1) → row(3, 1) ↗
```

---

## Connection Format

```typescript
interface Connection {
  id: string;        // Unique ID (use a short prefix + number, e.g. 'ab1', 'ab2')
  from: string;      // Source node ID
  to: string;        // Target node ID
  fromPort: string;  // Usually 'output'
  toPort: string;    // Usually 'input'
  label?: string;    // Optional edge label (e.g. 'fallback', 'deployed')
}
```

---

## Step-by-Step: Adding a New Diagram

### 1. Define nodes and connections

```typescript
// ── Your Diagram Title ────────────────────────────────────────────────

const yourDiagramNodes: NodeData[] = [
  { id: 'yd-start', type: 'trigger', position: row(0, 0), title: 'Start', subtitle: 'Entry point', isConfigured: true },
  { id: 'yd-process', type: 'code-tool', position: row(1, 0), title: 'Process', subtitle: 'Transform data', isConfigured: true },
  { id: 'yd-store', type: 'memory', position: row(2, 0), title: 'Store', subtitle: 'Save to database' },
  { id: 'yd-end', type: 'trigger', position: row(3, 0), title: 'Done', subtitle: 'Return result', isConfigured: true },
];

const yourDiagramConnections: Connection[] = [
  { id: 'yd1', from: 'yd-start', to: 'yd-process', fromPort: 'output', toPort: 'input' },
  { id: 'yd2', from: 'yd-process', to: 'yd-store', fromPort: 'output', toPort: 'input' },
  { id: 'yd3', from: 'yd-store', to: 'yd-end', fromPort: 'output', toPort: 'input' },
];
```

### 2. Add to SYSTEM_DIAGRAMS array

Find the correct category section and add your entry:

```typescript
{
  id: 'your-diagram',
  title: 'Your Diagram Title',
  description: 'One or two sentences explaining the system flow.',
  icon: Bot,                              // Import from lucide-react
  colorClass: 'text-teal-400 bg-teal-500/20',
  category: 'Agents',                     // Pick the right category
  nodes: yourDiagramNodes,
  connections: yourDiagramConnections,
  edgeFunctions: ['edge-fn-name'],
  tables: ['table_name'],
},
```

### 3. Import any new icons

If you use a Lucide icon not already imported, add it to the import at the top of the file:

```typescript
import {
  Bot, Workflow, BookOpen, Sparkles, Gamepad2, Database,
  Shield, KeyRound, Brain, Clock, Radio, ImageIcon, Map, Search,
  Users, YourNewIcon,  // ← add here
  type LucideIcon,
} from 'lucide-react';
```

---

## Categories

| Category | When to Use |
|----------|-------------|
| `Core` | Primary system pipelines (NPC chat, workflow execution, deployment, memory) |
| `Agents` | Agent-specific flows (PicoClaw lifecycle, studio agents, NPC-agent mapping) |
| `Content` | Content creation and retrieval (lore ingestion, RAG search, fragments) |
| `Game` | Game runtime systems (objects, registry sync, realtime broadcasting) |
| `Infrastructure` | Supporting services (auth, credentials, scheduler, AI providers, image gen) |

---

## Validation Checklist

Before submitting:

- [ ] All node IDs are unique within the diagram (use a 2-3 letter prefix like `yd-`)
- [ ] All connection `from`/`to` reference valid node IDs
- [ ] All connections use `fromPort: 'output'` and `toPort: 'input'`
- [ ] Connection IDs are unique (use prefix + number like `yd1`, `yd2`)
- [ ] `category` matches one of the valid options
- [ ] `id` in the diagram entry is unique across all diagrams
- [ ] `edgeFunctions` lists only real edge functions from `supabase/functions/`
- [ ] `tables` lists only real database tables
- [ ] Icon is imported from `lucide-react`
- [ ] Nodes use `isConfigured: true` for configured steps (shows green checkmark)

---

## Example: Existing Diagrams for Reference

Look at these existing diagrams in the file as examples:

- **Simple linear flow:** Image Generation (7 nodes, straight line)
- **Branching flow:** NPC Chat Pipeline (8 nodes, fork at PicoClaw check)
- **Two parallel tracks:** Game Object Actions (9 nodes, two independent flows)
- **Complex with merge:** Memory Service Pipeline (8 nodes, fork + merge)

---

## Notes

- The canvas auto-pans to fit all nodes, so don't worry about exact positioning beyond relative layout
- Keep node titles short (under 20 chars) — they truncate in the card
- Subtitles should describe what the node does, not how
- Use `label` on connections sparingly — only for forks/branches where the path matters
- The `getGameScaffoldNodes()` function at the bottom of the file handles game integration scaffolding — you don't need to modify it for new diagrams
