
# Lore Neural Network -- Live Knowledge Visualization

## Overview

Replace the previously planned simple SVG knowledge graph with a **3D neural network visualization** powered by Three.js. Each node in the network represents a real lore entity (character, location, faction, event, item) extracted from your `world_lore_entries`, and connections represent relationships between them. As you add more lore and chat with the Lorekeeper, the network grows organically.

Clicking a node highlights the corresponding lore entry. Clicking a lore entry pulses that node in the 3D view.

---

## How It Works

1. **"Map World" button** in the Lorekeeper chat sends all lore entries to the LLM with a structured prompt asking it to return a JSON knowledge graph (nodes + edges).
2. The JSON is parsed and fed into a Three.js renderer adapted from your uploaded neural network code.
3. Each node is positioned using a force-directed sphere layout, color-coded by entity type (characters = blue, locations = green, factions = purple, events = amber, items = cyan).
4. Connections between nodes have strength values based on how strongly the LLM rated the relationship.
5. The visualization is interactive: orbit controls, click-to-pulse, and clicking a node shows its details.
6. As you add more lore entries and re-run "Map World," the graph grows with more nodes and denser connections.

---

## Data Flow

```text
WorldLore page
  |-- Tab toggle: Chat | Neural Map
  |
  |-- Chat tab: LorekeeperChat
  |     |-- "Map World" button sends structured prompt
  |     |-- Parses JSON response into KnowledgeGraph
  |     |-- Calls onKnowledgeUpdate(graph) callback
  |
  |-- Neural Map tab: LoreNeuralNetwork
        |-- Receives KnowledgeGraph data
        |-- Maps nodes to Three.js points (position, color, size by type)
        |-- Maps edges to Three.js connections (strength, color)
        |-- Three.js scene with bloom, orbit controls, click pulses
        |-- Click node -> fires onNodeSelect(loreEntryId)
```

---

## Files

| File | Action | Purpose |
|------|--------|---------|
| `src/components/lore/LoreNeuralNetwork.tsx` | **New** | Three.js 3D neural network component adapted from the uploaded HTML. Uses React refs to manage the Three.js lifecycle. Accepts `KnowledgeGraph` data and renders nodes/connections with custom shaders. |
| `src/components/lore/LorekeeperChat.tsx` | **Edit** | Add "Map World" button next to "Review All Lore." On click, sends a structured prompt to the Lorekeeper asking for JSON knowledge graph output. Parses the response and calls new `onKnowledgeUpdate` prop. |
| `src/pages/WorldLore.tsx` | **Edit** | Add tab toggle (Chat / Neural Map). Manage `KnowledgeGraph` state. Pass `onKnowledgeUpdate` to chat, pass graph data to neural network component. Wire node click to lore entry selection. |

---

## Technical Details

### KnowledgeGraph Data Shape

```typescript
interface KnowledgeNode {
  id: string;
  label: string;
  type: 'character' | 'location' | 'faction' | 'event' | 'item' | 'concept';
  description: string;
  confidence: number; // 0-1
  loreEntryIds: string[]; // which entries mention this
}

interface KnowledgeEdge {
  source: string; // node id
  target: string; // node id
  label: string;  // e.g. "allied_with", "located_in"
  strength: number; // 0-1
}

interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}
```

### LoreNeuralNetwork Component

- Uses `useRef` + `useEffect` to initialize a Three.js scene inside a container div
- Adapted from the uploaded `index.html`: same custom GLSL shaders for nodes (glow, pulse, breathing) and connections (flowing energy, pulse propagation), same bloom post-processing, same orbit controls with auto-rotate
- Instead of generating random formations, it builds the network from `KnowledgeGraph` data:
  - Nodes are positioned on a sphere using golden-ratio distribution (same algorithm from the uploaded code), with layer/level determined by entity type
  - Node size scales with how many lore entries reference that entity (more mentions = larger node)
  - Node color is mapped by type using a custom palette (characters = blue/purple, locations = green/teal, factions = purple/magenta, events = amber/gold, items = cyan)
  - Edge strength maps directly to connection opacity/thickness
- Click interaction: raycasting against nodes. When a node is clicked, it triggers an energy pulse (same visual as the uploaded code) and fires `onNodeSelect` with the node's `loreEntryIds`
- Hover shows a floating label with the node's name and type
- Cleanup on unmount disposes all Three.js geometries, materials, and the renderer

### "Map World" Prompt

The chat sends a prompt like:

```
Analyze all provided lore entries. Extract every named character, location, 
faction, event, and notable item. For each, provide a short description and 
a confidence level (0-1) for how well-defined it is. Then identify all 
relationships between entities with a strength rating. 
Return ONLY valid JSON: {"nodes": [...], "edges": [...]}
```

The lore context (all entries) is appended. The response is parsed with `JSON.parse`, with a regex fallback to extract JSON from markdown code fences.

### WorldLore Page Changes

- Add state: `const [activeTab, setActiveTab] = useState<'chat' | 'neural'>('chat')`
- Add state: `const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null)`
- Render tab buttons above the right panel
- When neural tab is active, render `LoreNeuralNetwork` with the graph data
- When a node is clicked in the network, switch the left panel selection to the matching lore entry

### Dependencies

Three.js will be added as a project dependency (`three` + `@types/three`). This is the only new dependency. The uploaded code used CDN imports; the React component will use the npm package instead.
