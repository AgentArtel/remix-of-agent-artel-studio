export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'character' | 'location' | 'faction' | 'event' | 'item' | 'concept';
  description: string;
  confidence: number;
  loreEntryIds: string[];
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  label: string;
  strength: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export const NODE_TYPE_COLORS: Record<KnowledgeNode['type'], [number, number, number]> = {
  character: [0.4, 0.5, 0.93],   // blue-purple
  location:  [0.26, 0.91, 0.48],  // green
  faction:   [0.62, 0.29, 0.71],  // purple
  event:     [0.97, 0.76, 0.15],  // amber
  item:      [0.31, 0.76, 0.97],  // cyan
  concept:   [0.7, 0.7, 0.75],    // silver
};

export const NODE_TYPE_ORDER: KnowledgeNode['type'][] = [
  'character', 'location', 'faction', 'event', 'item', 'concept',
];

export function parseKnowledgeGraph(raw: string): KnowledgeGraph | null {
  try {
    // Try direct parse
    const parsed = JSON.parse(raw);
    if (parsed.nodes && parsed.edges) return parsed;
  } catch {
    // Try extracting from markdown code fences
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.nodes && parsed.edges) return parsed;
      } catch { /* fall through */ }
    }
    // Try finding raw JSON object
    const jsonMatch = raw.match(/\{[\s\S]*"nodes"[\s\S]*"edges"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.nodes && parsed.edges) return parsed;
      } catch { /* fall through */ }
    }
  }
  return null;
}
