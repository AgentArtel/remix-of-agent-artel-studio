import type { NodeData, Connection } from '@/types';
import {
  Bot, Workflow, BookOpen, Sparkles, Gamepad2, Database,
  Shield, KeyRound, Brain, Clock, Radio, ImageIcon, Map, Search,
  type LucideIcon,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SystemDiagram {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  category: 'Core' | 'Content' | 'Game' | 'Infrastructure';
  nodes: NodeData[];
  connections: Connection[];
  edgeFunctions: string[];
  tables: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────

const NODE_GAP_X = 280;
const NODE_GAP_Y = 180;

function row(col: number, rowIdx: number): { x: number; y: number } {
  return { x: col * NODE_GAP_X, y: rowIdx * NODE_GAP_Y };
}

// ══════════════════════════════════════════════════════════════════════════
// CORE SYSTEMS
// ══════════════════════════════════════════════════════════════════════════

// ── 1. NPC Chat Pipeline ──────────────────────────────────────────────────

const npcChatNodes: NodeData[] = [
  { id: 'player-msg', type: 'trigger', position: row(0, 0), title: 'Player Message', subtitle: 'Chat input from game client', isConfigured: true },
  { id: 'npc-ai-chat', type: 'webhook', position: row(1, 0), title: 'npc-ai-chat', subtitle: 'Edge function — validates session', isConfigured: true },
  { id: 'picoclaw-check', type: 'code-tool', position: row(2, 0), title: 'PicoClaw Check', subtitle: 'Is agent deployed to gateway?', isConfigured: true },
  { id: 'picoclaw-route', type: 'http-tool', position: row(3, 0), title: 'PicoClaw Gateway', subtitle: 'Forward to deployed agent' },
  { id: 'build-prompt', type: 'code-tool', position: row(2, 1), title: 'Build System Prompt', subtitle: 'Personality + skills + memory', isConfigured: true },
  { id: 'route-llm', type: 'ai-agent', position: row(3, 1), title: 'Route to LLM', subtitle: 'Gemini / Kimi / gateway model', isConfigured: true },
  { id: 'save-memory', type: 'memory', position: row(4, 1), title: 'Save to Memory', subtitle: 'agent_memory table' },
  { id: 'response', type: 'trigger', position: row(5, 0), title: 'Response', subtitle: 'Return to game client', isConfigured: true },
];

const npcChatConnections: Connection[] = [
  { id: 'nc1', from: 'player-msg', to: 'npc-ai-chat', fromPort: 'output', toPort: 'input' },
  { id: 'nc2', from: 'npc-ai-chat', to: 'picoclaw-check', fromPort: 'output', toPort: 'input' },
  { id: 'nc3', from: 'picoclaw-check', to: 'picoclaw-route', fromPort: 'output', toPort: 'input', label: 'deployed' },
  { id: 'nc4', from: 'picoclaw-route', to: 'response', fromPort: 'output', toPort: 'input' },
  { id: 'nc5', from: 'picoclaw-check', to: 'build-prompt', fromPort: 'output', toPort: 'input', label: 'fallback' },
  { id: 'nc6', from: 'build-prompt', to: 'route-llm', fromPort: 'output', toPort: 'input' },
  { id: 'nc7', from: 'route-llm', to: 'save-memory', fromPort: 'output', toPort: 'input' },
  { id: 'nc8', from: 'save-memory', to: 'response', fromPort: 'output', toPort: 'input' },
];

// ── 2. PicoClaw Agent Deployment ──────────────────────────────────────────

const picoClawNodes: NodeData[] = [
  { id: 'deploy-action', type: 'trigger', position: row(0, 0), title: 'Deploy Action', subtitle: 'From Studio or API', isConfigured: true },
  { id: 'pico-bridge', type: 'webhook', position: row(1, 0), title: 'picoclaw-bridge', subtitle: 'Edge function', isConfigured: true },
  { id: 'load-agents', type: 'memory', position: row(2, 0), title: 'Load Agents', subtitle: 'picoclaw_agents table' },
  { id: 'load-skills', type: 'memory', position: row(2, 1), title: 'Load Skills', subtitle: 'picoclaw_skills + agent_skills' },
  { id: 'build-config', type: 'code-tool', position: row(3, 0), title: 'Build Full Config', subtitle: 'Merge agents + skills + .md files', isConfigured: true },
  { id: 'push-gateway', type: 'http-tool', position: row(4, 0), title: 'Push to Gateway', subtitle: 'PicoClaw API deploy endpoint' },
  { id: 'update-status', type: 'memory', position: row(5, 0), title: 'Update DB Status', subtitle: 'deployment_status → deployed' },
  { id: 'deploy-response', type: 'trigger', position: row(6, 0), title: 'Response', subtitle: 'Return deploy result', isConfigured: true },
];

const picoClawConnections: Connection[] = [
  { id: 'pc1', from: 'deploy-action', to: 'pico-bridge', fromPort: 'output', toPort: 'input' },
  { id: 'pc2', from: 'pico-bridge', to: 'load-agents', fromPort: 'output', toPort: 'input' },
  { id: 'pc3', from: 'pico-bridge', to: 'load-skills', fromPort: 'output', toPort: 'input' },
  { id: 'pc4', from: 'load-agents', to: 'build-config', fromPort: 'output', toPort: 'input' },
  { id: 'pc5', from: 'load-skills', to: 'build-config', fromPort: 'output', toPort: 'input' },
  { id: 'pc6', from: 'build-config', to: 'push-gateway', fromPort: 'output', toPort: 'input' },
  { id: 'pc7', from: 'push-gateway', to: 'update-status', fromPort: 'output', toPort: 'input' },
  { id: 'pc8', from: 'update-status', to: 'deploy-response', fromPort: 'output', toPort: 'input' },
];

// ── 3. Studio Workflow Execution ──────────────────────────────────────────

const studioWorkflowNodes: NodeData[] = [
  { id: 'wf-trigger', type: 'trigger', position: row(0, 0), title: 'Trigger Workflow', subtitle: 'Manual run or schedule', isConfigured: true },
  { id: 'studio-run', type: 'webhook', position: row(1, 0), title: 'studio-run', subtitle: 'Edge function', isConfigured: true },
  { id: 'load-wf', type: 'memory', position: row(2, 0), title: 'Load Workflow', subtitle: 'studio_workflows table' },
  { id: 'check-n8n', type: 'code-tool', position: row(3, 0), title: 'Check n8n Registry', subtitle: 'n8n_webhook_registry lookup', isConfigured: true },
  { id: 'n8n-forward', type: 'http-tool', position: row(4, 0), title: 'Forward to n8n', subtitle: 'Execute via webhook' },
  { id: 'local-sim', type: 'code-tool', position: row(4, 1), title: 'Local Simulation', subtitle: 'Node-by-node execution', isConfigured: true },
  { id: 'save-exec', type: 'memory', position: row(5, 0), title: 'Save Execution', subtitle: 'studio_executions table' },
  { id: 'wf-result', type: 'trigger', position: row(6, 0), title: 'Return Result', subtitle: 'Execution output', isConfigured: true },
];

const studioWorkflowConnections: Connection[] = [
  { id: 'sw1', from: 'wf-trigger', to: 'studio-run', fromPort: 'output', toPort: 'input' },
  { id: 'sw2', from: 'studio-run', to: 'load-wf', fromPort: 'output', toPort: 'input' },
  { id: 'sw3', from: 'load-wf', to: 'check-n8n', fromPort: 'output', toPort: 'input' },
  { id: 'sw4', from: 'check-n8n', to: 'n8n-forward', fromPort: 'output', toPort: 'input', label: 'has webhook' },
  { id: 'sw5', from: 'check-n8n', to: 'local-sim', fromPort: 'output', toPort: 'input', label: 'no webhook' },
  { id: 'sw6', from: 'n8n-forward', to: 'save-exec', fromPort: 'output', toPort: 'input' },
  { id: 'sw7', from: 'local-sim', to: 'save-exec', fromPort: 'output', toPort: 'input' },
  { id: 'sw8', from: 'save-exec', to: 'wf-result', fromPort: 'output', toPort: 'input' },
];

// ── 4. Memory Service Pipeline ────────────────────────────────────────────

const memoryServiceNodes: NodeData[] = [
  { id: 'mem-msg', type: 'trigger', position: row(0, 0), title: 'Chat Message', subtitle: 'Incoming from player or studio', isConfigured: true },
  { id: 'mem-save', type: 'webhook', position: row(1, 0), title: 'Save to Memory', subtitle: 'npc-ai-chat / studio handler', isConfigured: true },
  { id: 'mem-determine', type: 'code-tool', position: row(2, 0), title: 'Determine Context', subtitle: 'Game agent vs Studio agent', isConfigured: true },
  { id: 'mem-game', type: 'memory', position: row(3, 0), title: 'agent_memory', subtitle: 'Game NPC conversations' },
  { id: 'mem-studio', type: 'memory', position: row(3, 1), title: 'studio_agent_memory', subtitle: 'Studio agent conversations' },
  { id: 'mem-load', type: 'code-tool', position: row(4, 0), title: 'Load Window', subtitle: 'Last N messages by session', isConfigured: true },
  { id: 'mem-build', type: 'code-tool', position: row(5, 0), title: 'Build Context', subtitle: 'System prompt + history', isConfigured: true },
  { id: 'mem-return', type: 'trigger', position: row(6, 0), title: 'Return Messages', subtitle: 'Ready for LLM', isConfigured: true },
];

const memoryServiceConnections: Connection[] = [
  { id: 'ms1', from: 'mem-msg', to: 'mem-save', fromPort: 'output', toPort: 'input' },
  { id: 'ms2', from: 'mem-save', to: 'mem-determine', fromPort: 'output', toPort: 'input' },
  { id: 'ms3', from: 'mem-determine', to: 'mem-game', fromPort: 'output', toPort: 'input', label: 'game' },
  { id: 'ms4', from: 'mem-determine', to: 'mem-studio', fromPort: 'output', toPort: 'input', label: 'studio' },
  { id: 'ms5', from: 'mem-game', to: 'mem-load', fromPort: 'output', toPort: 'input' },
  { id: 'ms6', from: 'mem-studio', to: 'mem-load', fromPort: 'output', toPort: 'input' },
  { id: 'ms7', from: 'mem-load', to: 'mem-build', fromPort: 'output', toPort: 'input' },
  { id: 'ms8', from: 'mem-build', to: 'mem-return', fromPort: 'output', toPort: 'input' },
];

// ══════════════════════════════════════════════════════════════════════════
// CONTENT
// ══════════════════════════════════════════════════════════════════════════

// ── 5. Lore Ingestion (formerly "Lore Pipeline") ──────────────────────────

const lorePipelineNodes: NodeData[] = [
  { id: 'upload-lore', type: 'trigger', position: row(0, 0), title: 'Upload Lore File', subtitle: 'Text, PDF, or image', isConfigured: true },
  { id: 'extract-text', type: 'webhook', position: row(1, 0), title: 'extract-lore-text', subtitle: 'Edge function', isConfigured: true },
  { id: 'chunk-text', type: 'code-tool', position: row(2, 0), title: 'Chunk Text', subtitle: 'Split into embedding-sized chunks', isConfigured: true },
  { id: 'embed-lore', type: 'webhook', position: row(3, 0), title: 'embed-lore', subtitle: 'Edge function', isConfigured: true },
  { id: 'gemini-embed', type: 'http-tool', position: row(4, 0), title: 'Gemini Embed API', subtitle: 'Generate vector embeddings' },
  { id: 'store-embeddings', type: 'memory', position: row(5, 0), title: 'Store Embeddings', subtitle: 'lore_embeddings table' },
  { id: 'fragment-submit', type: 'trigger', position: row(1, 1), title: 'Fragment Submitted', subtitle: 'Player discovers fragment', isConfigured: true },
  { id: 'decipher', type: 'webhook', position: row(2, 1), title: 'decipher-fragment', subtitle: 'Edge function', isConfigured: true },
  { id: 'reveal-chunks', type: 'code-tool', position: row(3, 1), title: 'Reveal Chunks', subtitle: 'Increment revealed_chunks', isConfigured: true },
  { id: 'update-progress', type: 'memory', position: row(4, 1), title: 'Update Progress', subtitle: 'fragment_archive table' },
];

const lorePipelineConnections: Connection[] = [
  { id: 'lp1', from: 'upload-lore', to: 'extract-text', fromPort: 'output', toPort: 'input' },
  { id: 'lp2', from: 'extract-text', to: 'chunk-text', fromPort: 'output', toPort: 'input' },
  { id: 'lp3', from: 'chunk-text', to: 'embed-lore', fromPort: 'output', toPort: 'input' },
  { id: 'lp4', from: 'embed-lore', to: 'gemini-embed', fromPort: 'output', toPort: 'input' },
  { id: 'lp5', from: 'gemini-embed', to: 'store-embeddings', fromPort: 'output', toPort: 'input' },
  { id: 'lp6', from: 'fragment-submit', to: 'decipher', fromPort: 'output', toPort: 'input' },
  { id: 'lp7', from: 'decipher', to: 'reveal-chunks', fromPort: 'output', toPort: 'input' },
  { id: 'lp8', from: 'reveal-chunks', to: 'update-progress', fromPort: 'output', toPort: 'input' },
];

// ── 6. Lore RAG Search ────────────────────────────────────────────────────

const loreRagNodes: NodeData[] = [
  { id: 'rag-query', type: 'trigger', position: row(0, 0), title: 'User Query', subtitle: 'Lorekeeper or search input', isConfigured: true },
  { id: 'rag-embed-fn', type: 'webhook', position: row(1, 0), title: 'gemini-embed', subtitle: 'Edge function', isConfigured: true },
  { id: 'rag-gen-embed', type: 'http-tool', position: row(2, 0), title: 'Generate Embedding', subtitle: '768-dim query vector' },
  { id: 'rag-rpc', type: 'memory', position: row(3, 0), title: 'match_lore_chunks', subtitle: 'pgvector cosine similarity' },
  { id: 'rag-filter', type: 'code-tool', position: row(4, 0), title: 'Filter Revealed', subtitle: 'Only is_revealed = true', isConfigured: true },
  { id: 'rag-top', type: 'memory', position: row(5, 0), title: 'Top 8 Chunks', subtitle: 'Ranked by similarity' },
  { id: 'rag-context', type: 'code-tool', position: row(6, 0), title: 'Build LLM Context', subtitle: 'Inject chunks into prompt', isConfigured: true },
  { id: 'rag-lorekeeper', type: 'ai-agent', position: row(7, 0), title: 'Lorekeeper Agent', subtitle: 'Responds with lore knowledge', isConfigured: true },
  { id: 'rag-response', type: 'trigger', position: row(8, 0), title: 'Response', subtitle: 'Lorekeeper answer', isConfigured: true },
];

const loreRagConnections: Connection[] = [
  { id: 'rr1', from: 'rag-query', to: 'rag-embed-fn', fromPort: 'output', toPort: 'input' },
  { id: 'rr2', from: 'rag-embed-fn', to: 'rag-gen-embed', fromPort: 'output', toPort: 'input' },
  { id: 'rr3', from: 'rag-gen-embed', to: 'rag-rpc', fromPort: 'output', toPort: 'input' },
  { id: 'rr4', from: 'rag-rpc', to: 'rag-filter', fromPort: 'output', toPort: 'input' },
  { id: 'rr5', from: 'rag-filter', to: 'rag-top', fromPort: 'output', toPort: 'input' },
  { id: 'rr6', from: 'rag-top', to: 'rag-context', fromPort: 'output', toPort: 'input' },
  { id: 'rr7', from: 'rag-context', to: 'rag-lorekeeper', fromPort: 'output', toPort: 'input' },
  { id: 'rr8', from: 'rag-lorekeeper', to: 'rag-response', fromPort: 'output', toPort: 'input' },
];

// ══════════════════════════════════════════════════════════════════════════
// GAME
// ══════════════════════════════════════════════════════════════════════════

// ── 7. Game Object Actions ────────────────────────────────────────────────

const gameObjectNodes: NodeData[] = [
  { id: 'player-interact', type: 'trigger', position: row(0, 0), title: 'Player Interaction', subtitle: 'Click / use object in game', isConfigured: true },
  { id: 'obj-action', type: 'webhook', position: row(1, 0), title: 'object-action', subtitle: 'Edge function', isConfigured: true },
  { id: 'lookup-webhook', type: 'memory', position: row(2, 0), title: 'Lookup n8n Webhook', subtitle: 'n8n_webhook_registry' },
  { id: 'forward-n8n', type: 'http-tool', position: row(3, 0), title: 'Forward to n8n', subtitle: 'Execute automation' },
  { id: 'obj-result', type: 'trigger', position: row(4, 0), title: 'Return Result', subtitle: 'Action outcome to client', isConfigured: true },
  { id: 'crud-req', type: 'trigger', position: row(0, 1), title: 'CRUD Request', subtitle: 'Studio or API call', isConfigured: true },
  { id: 'obj-api', type: 'webhook', position: row(1, 1), title: 'object-api', subtitle: 'Edge function', isConfigured: true },
  { id: 'supabase-crud', type: 'memory', position: row(2, 1), title: 'Supabase CRUD', subtitle: 'object_templates / instances' },
  { id: 'crud-response', type: 'trigger', position: row(3, 1), title: 'Response', subtitle: 'Return data', isConfigured: true },
];

const gameObjectConnections: Connection[] = [
  { id: 'go1', from: 'player-interact', to: 'obj-action', fromPort: 'output', toPort: 'input' },
  { id: 'go2', from: 'obj-action', to: 'lookup-webhook', fromPort: 'output', toPort: 'input' },
  { id: 'go3', from: 'lookup-webhook', to: 'forward-n8n', fromPort: 'output', toPort: 'input' },
  { id: 'go4', from: 'forward-n8n', to: 'obj-result', fromPort: 'output', toPort: 'input' },
  { id: 'go5', from: 'crud-req', to: 'obj-api', fromPort: 'output', toPort: 'input' },
  { id: 'go6', from: 'obj-api', to: 'supabase-crud', fromPort: 'output', toPort: 'input' },
  { id: 'go7', from: 'supabase-crud', to: 'crud-response', fromPort: 'output', toPort: 'input' },
];

// ── 8. Game Registry Sync ─────────────────────────────────────────────────

const gameRegistryNodes: NodeData[] = [
  { id: 'gr-boot', type: 'trigger', position: row(0, 0), title: 'Game Server Boot', subtitle: 'RPGJS initializes', isConfigured: true },
  { id: 'gr-parse', type: 'code-tool', position: row(1, 0), title: 'Parse TMX Maps', subtitle: 'Extract spawn points & layers', isConfigured: true },
  { id: 'gr-upsert', type: 'memory', position: row(2, 0), title: 'Upsert Registry', subtitle: 'game_registry table' },
  { id: 'gr-studio', type: 'trigger', position: row(0, 1), title: 'Studio Page Load', subtitle: 'NPC or Agent form opens', isConfigured: true },
  { id: 'gr-hook', type: 'code-tool', position: row(1, 1), title: 'useGameRegistry', subtitle: 'React Query hook', isConfigured: true },
  { id: 'gr-filter', type: 'code-tool', position: row(2, 1), title: 'Filter by Type', subtitle: 'map / sprite / spawn_point', isConfigured: true },
  { id: 'gr-render', type: 'trigger', position: row(3, 1), title: 'Render Dropdown', subtitle: 'Dynamic form options', isConfigured: true },
];

const gameRegistryConnections: Connection[] = [
  { id: 'gr1', from: 'gr-boot', to: 'gr-parse', fromPort: 'output', toPort: 'input' },
  { id: 'gr2', from: 'gr-parse', to: 'gr-upsert', fromPort: 'output', toPort: 'input' },
  { id: 'gr3', from: 'gr-studio', to: 'gr-hook', fromPort: 'output', toPort: 'input' },
  { id: 'gr4', from: 'gr-hook', to: 'gr-filter', fromPort: 'output', toPort: 'input' },
  { id: 'gr5', from: 'gr-filter', to: 'gr-render', fromPort: 'output', toPort: 'input' },
  { id: 'gr6', from: 'gr-upsert', to: 'gr-hook', fromPort: 'output', toPort: 'input', label: 'realtime' },
];

// ── 9. Realtime Broadcasting ──────────────────────────────────────────────

const realtimeNodes: NodeData[] = [
  { id: 'rt-action', type: 'trigger', position: row(0, 0), title: 'Studio Action', subtitle: 'NPC created / updated / deleted', isConfigured: true },
  { id: 'rt-write', type: 'memory', position: row(1, 0), title: 'DB Write', subtitle: 'Supabase insert/update' },
  { id: 'rt-broadcast', type: 'code-tool', position: row(2, 0), title: 'gameBroadcast()', subtitle: 'Helper sends to channel', isConfigured: true },
  { id: 'rt-realtime', type: 'webhook', position: row(3, 0), title: 'Supabase Realtime', subtitle: 'WebSocket broadcast', isConfigured: true },
  { id: 'rt-content', type: 'code-tool', position: row(4, 0), title: 'content_broadcast', subtitle: 'NPC & config events', isConfigured: true },
  { id: 'rt-game-events', type: 'code-tool', position: row(4, 1), title: 'game_events', subtitle: 'Fragment & lore events', isConfigured: true },
  { id: 'rt-client', type: 'trigger', position: row(5, 0), title: 'Game Client', subtitle: 'Receives & applies update', isConfigured: true },
];

const realtimeConnections: Connection[] = [
  { id: 'rt1', from: 'rt-action', to: 'rt-write', fromPort: 'output', toPort: 'input' },
  { id: 'rt2', from: 'rt-write', to: 'rt-broadcast', fromPort: 'output', toPort: 'input' },
  { id: 'rt3', from: 'rt-broadcast', to: 'rt-realtime', fromPort: 'output', toPort: 'input' },
  { id: 'rt4', from: 'rt-realtime', to: 'rt-content', fromPort: 'output', toPort: 'input', label: 'content' },
  { id: 'rt5', from: 'rt-realtime', to: 'rt-game-events', fromPort: 'output', toPort: 'input', label: 'events' },
  { id: 'rt6', from: 'rt-content', to: 'rt-client', fromPort: 'output', toPort: 'input' },
  { id: 'rt7', from: 'rt-game-events', to: 'rt-client', fromPort: 'output', toPort: 'input' },
];

// ══════════════════════════════════════════════════════════════════════════
// INFRASTRUCTURE
// ══════════════════════════════════════════════════════════════════════════

// ── 10. AI Services ───────────────────────────────────────────────────────

const aiServicesNodes: NodeData[] = [
  { id: 'ai-request', type: 'trigger', position: row(0, 1), title: 'AI Request', subtitle: 'From any edge function', isConfigured: true },
  { id: 'gemini-chat-fn', type: 'webhook', position: row(1, 0), title: 'gemini-chat', subtitle: 'Text completions', isConfigured: true },
  { id: 'gemini-embed-fn', type: 'webhook', position: row(1, 1), title: 'gemini-embed', subtitle: 'Text embeddings', isConfigured: true },
  { id: 'gemini-vision-fn', type: 'webhook', position: row(1, 2), title: 'gemini-vision', subtitle: 'Image analysis', isConfigured: true },
  { id: 'kimi-chat-fn', type: 'webhook', position: row(2, 0), title: 'kimi-chat', subtitle: 'Moonshot completions', isConfigured: true },
  { id: 'generate-image-fn', type: 'webhook', position: row(2, 2), title: 'generate-image', subtitle: 'AI image generation', isConfigured: true },
  { id: 'external-api', type: 'http-tool', position: row(3, 1), title: 'External AI API', subtitle: 'Google, Moonshot, etc.' },
  { id: 'ai-response', type: 'trigger', position: row(4, 1), title: 'Response', subtitle: 'Generated content', isConfigured: true },
];

const aiServicesConnections: Connection[] = [
  { id: 'ai1', from: 'ai-request', to: 'gemini-chat-fn', fromPort: 'output', toPort: 'input' },
  { id: 'ai2', from: 'ai-request', to: 'gemini-embed-fn', fromPort: 'output', toPort: 'input' },
  { id: 'ai3', from: 'ai-request', to: 'gemini-vision-fn', fromPort: 'output', toPort: 'input' },
  { id: 'ai4', from: 'gemini-chat-fn', to: 'kimi-chat-fn', fromPort: 'output', toPort: 'input', label: 'fallback' },
  { id: 'ai5', from: 'gemini-chat-fn', to: 'external-api', fromPort: 'output', toPort: 'input' },
  { id: 'ai6', from: 'gemini-embed-fn', to: 'external-api', fromPort: 'output', toPort: 'input' },
  { id: 'ai7', from: 'gemini-vision-fn', to: 'generate-image-fn', fromPort: 'output', toPort: 'input' },
  { id: 'ai8', from: 'kimi-chat-fn', to: 'external-api', fromPort: 'output', toPort: 'input' },
  { id: 'ai9', from: 'generate-image-fn', to: 'external-api', fromPort: 'output', toPort: 'input' },
  { id: 'ai10', from: 'external-api', to: 'ai-response', fromPort: 'output', toPort: 'input' },
];

// ── 11. Authentication Flow ───────────────────────────────────────────────

const authNodes: NodeData[] = [
  { id: 'auth-login', type: 'trigger', position: row(0, 0), title: 'Login Page', subtitle: 'Email + password form', isConfigured: true },
  { id: 'auth-supabase', type: 'webhook', position: row(1, 0), title: 'Supabase Auth', subtitle: 'signInWithPassword', isConfigured: true },
  { id: 'auth-listener', type: 'code-tool', position: row(2, 0), title: 'onAuthStateChange', subtitle: 'Auth event listener', isConfigured: true },
  { id: 'auth-context', type: 'code-tool', position: row(3, 0), title: 'AuthContext', subtitle: 'React context provider', isConfigured: true },
  { id: 'auth-routes', type: 'code-tool', position: row(4, 0), title: 'Protected Routes', subtitle: 'Redirect if no session', isConfigured: true },
  { id: 'auth-session', type: 'trigger', position: row(5, 0), title: 'Session Active', subtitle: 'User authenticated', isConfigured: true },
  { id: 'auth-signout', type: 'trigger', position: row(2, 1), title: 'Sign Out', subtitle: 'User clicks logout', isConfigured: true },
  { id: 'auth-clear', type: 'webhook', position: row(3, 1), title: 'supabase.auth.signOut', subtitle: 'Clear session token', isConfigured: true },
  { id: 'auth-redirect', type: 'trigger', position: row(4, 1), title: 'Redirect to Login', subtitle: 'Back to auth page', isConfigured: true },
];

const authConnections: Connection[] = [
  { id: 'au1', from: 'auth-login', to: 'auth-supabase', fromPort: 'output', toPort: 'input' },
  { id: 'au2', from: 'auth-supabase', to: 'auth-listener', fromPort: 'output', toPort: 'input' },
  { id: 'au3', from: 'auth-listener', to: 'auth-context', fromPort: 'output', toPort: 'input' },
  { id: 'au4', from: 'auth-context', to: 'auth-routes', fromPort: 'output', toPort: 'input' },
  { id: 'au5', from: 'auth-routes', to: 'auth-session', fromPort: 'output', toPort: 'input' },
  { id: 'au6', from: 'auth-signout', to: 'auth-clear', fromPort: 'output', toPort: 'input' },
  { id: 'au7', from: 'auth-clear', to: 'auth-redirect', fromPort: 'output', toPort: 'input' },
];

// ── 12. Credential Management ─────────────────────────────────────────────

const credentialNodes: NodeData[] = [
  { id: 'cred-store', type: 'trigger', position: row(0, 0), title: 'Store Request', subtitle: 'User adds API key', isConfigured: true },
  { id: 'cred-fn', type: 'webhook', position: row(1, 0), title: 'manage-credential', subtitle: 'Edge function', isConfigured: true },
  { id: 'cred-validate', type: 'code-tool', position: row(2, 0), title: 'Validate Input', subtitle: 'Check service + key format', isConfigured: true },
  { id: 'cred-encrypt', type: 'memory', position: row(3, 0), title: 'pgp_sym_encrypt', subtitle: 'Encrypt with passphrase' },
  { id: 'cred-save', type: 'memory', position: row(4, 0), title: 'Store Credential', subtitle: 'studio_credentials table' },
  { id: 'cred-result', type: 'trigger', position: row(5, 0), title: 'Return Result', subtitle: 'Key hint only', isConfigured: true },
  { id: 'cred-retrieve', type: 'trigger', position: row(1, 1), title: 'Runtime Retrieve', subtitle: 'Edge function needs key', isConfigured: true },
  { id: 'cred-decrypt', type: 'memory', position: row(2, 1), title: 'pgp_sym_decrypt', subtitle: 'Decrypt via service_role' },
  { id: 'cred-use', type: 'http-tool', position: row(3, 1), title: 'Use in API Call', subtitle: 'External service request' },
];

const credentialConnections: Connection[] = [
  { id: 'cr1', from: 'cred-store', to: 'cred-fn', fromPort: 'output', toPort: 'input' },
  { id: 'cr2', from: 'cred-fn', to: 'cred-validate', fromPort: 'output', toPort: 'input' },
  { id: 'cr3', from: 'cred-validate', to: 'cred-encrypt', fromPort: 'output', toPort: 'input' },
  { id: 'cr4', from: 'cred-encrypt', to: 'cred-save', fromPort: 'output', toPort: 'input' },
  { id: 'cr5', from: 'cred-save', to: 'cred-result', fromPort: 'output', toPort: 'input' },
  { id: 'cr6', from: 'cred-retrieve', to: 'cred-decrypt', fromPort: 'output', toPort: 'input' },
  { id: 'cr7', from: 'cred-decrypt', to: 'cred-use', fromPort: 'output', toPort: 'input' },
];

// ── 13. Workflow Scheduler ────────────────────────────────────────────────

const schedulerNodes: NodeData[] = [
  { id: 'sch-tick', type: 'trigger', position: row(0, 0), title: 'pg_cron Tick', subtitle: 'Every minute check', isConfigured: true },
  { id: 'sch-fn', type: 'webhook', position: row(1, 0), title: 'workflow-scheduler', subtitle: 'Edge function', isConfigured: true },
  { id: 'sch-find', type: 'memory', position: row(2, 0), title: 'Find Due Schedules', subtitle: 'workflow_schedules query' },
  { id: 'sch-load', type: 'memory', position: row(3, 0), title: 'Load Workflow Steps', subtitle: 'workflow_templates table' },
  { id: 'sch-exec', type: 'http-tool', position: row(4, 0), title: 'Execute Steps', subtitle: 'Run each node sequentially' },
  { id: 'sch-save', type: 'memory', position: row(5, 0), title: 'Save Run Record', subtitle: 'workflow_runs table' },
  { id: 'sch-next', type: 'code-tool', position: row(6, 0), title: 'Compute Next Run', subtitle: 'Parse cron expression', isConfigured: true },
  { id: 'sch-update', type: 'memory', position: row(7, 0), title: 'Update Schedule', subtitle: 'Set next_run_at' },
  { id: 'sch-done', type: 'trigger', position: row(8, 0), title: 'Done', subtitle: 'Wait for next tick', isConfigured: true },
];

const schedulerConnections: Connection[] = [
  { id: 'sc1', from: 'sch-tick', to: 'sch-fn', fromPort: 'output', toPort: 'input' },
  { id: 'sc2', from: 'sch-fn', to: 'sch-find', fromPort: 'output', toPort: 'input' },
  { id: 'sc3', from: 'sch-find', to: 'sch-load', fromPort: 'output', toPort: 'input' },
  { id: 'sc4', from: 'sch-load', to: 'sch-exec', fromPort: 'output', toPort: 'input' },
  { id: 'sc5', from: 'sch-exec', to: 'sch-save', fromPort: 'output', toPort: 'input' },
  { id: 'sc6', from: 'sch-save', to: 'sch-next', fromPort: 'output', toPort: 'input' },
  { id: 'sc7', from: 'sch-next', to: 'sch-update', fromPort: 'output', toPort: 'input' },
  { id: 'sc8', from: 'sch-update', to: 'sch-done', fromPort: 'output', toPort: 'input' },
];

// ── 14. Image Generation ──────────────────────────────────────────────────

const imageGenNodes: NodeData[] = [
  { id: 'ig-req', type: 'trigger', position: row(0, 0), title: 'Generate Request', subtitle: 'From Studio or NPC skill', isConfigured: true },
  { id: 'ig-fn', type: 'webhook', position: row(1, 0), title: 'generate-image', subtitle: 'Edge function', isConfigured: true },
  { id: 'ig-validate', type: 'code-tool', position: row(2, 0), title: 'Validate Prompt', subtitle: 'Check length & safety', isConfigured: true },
  { id: 'ig-style', type: 'code-tool', position: row(3, 0), title: 'Build Styled Prompt', subtitle: 'Add style prefix/suffix', isConfigured: true },
  { id: 'ig-api', type: 'http-tool', position: row(4, 0), title: 'Imagen 4.0 API', subtitle: 'Google Gemini Imagen' },
  { id: 'ig-safety', type: 'code-tool', position: row(5, 0), title: 'Safety Check', subtitle: 'Verify response quality', isConfigured: true },
  { id: 'ig-return', type: 'trigger', position: row(6, 0), title: 'Return Image', subtitle: 'Base64 data URL', isConfigured: true },
];

const imageGenConnections: Connection[] = [
  { id: 'ig1', from: 'ig-req', to: 'ig-fn', fromPort: 'output', toPort: 'input' },
  { id: 'ig2', from: 'ig-fn', to: 'ig-validate', fromPort: 'output', toPort: 'input' },
  { id: 'ig3', from: 'ig-validate', to: 'ig-style', fromPort: 'output', toPort: 'input' },
  { id: 'ig4', from: 'ig-style', to: 'ig-api', fromPort: 'output', toPort: 'input' },
  { id: 'ig5', from: 'ig-api', to: 'ig-safety', fromPort: 'output', toPort: 'input' },
  { id: 'ig6', from: 'ig-safety', to: 'ig-return', fromPort: 'output', toPort: 'input' },
];

// ══════════════════════════════════════════════════════════════════════════
// EXPORT ALL DIAGRAMS
// ══════════════════════════════════════════════════════════════════════════

export const DIAGRAM_CATEGORIES = ['Core', 'Content', 'Game', 'Infrastructure'] as const;

export const SYSTEM_DIAGRAMS: SystemDiagram[] = [
  // ── Core ──
  {
    id: 'npc-chat',
    title: 'NPC Chat Pipeline',
    description: 'How player chat messages reach an NPC, get routed to an LLM, and return a response with memory persistence.',
    icon: Bot,
    colorClass: 'text-primary bg-primary/20',
    category: 'Core',
    nodes: npcChatNodes,
    connections: npcChatConnections,
    edgeFunctions: ['npc-ai-chat', 'picoclaw-bridge'],
    tables: ['agent_configs', 'agent_memory', 'picoclaw_agents', 'picoclaw_agent_skills'],
  },
  {
    id: 'picoclaw-deploy',
    title: 'PicoClaw Agent Deployment',
    description: 'How agents are loaded from the database, bundled with skills and .md files, then deployed to the PicoClaw gateway.',
    icon: Bot,
    colorClass: 'text-purple-400 bg-purple-500/20',
    category: 'Core',
    nodes: picoClawNodes,
    connections: picoClawConnections,
    edgeFunctions: ['picoclaw-bridge'],
    tables: ['picoclaw_agents', 'picoclaw_skills', 'picoclaw_agent_skills'],
  },
  {
    id: 'studio-workflow',
    title: 'Studio Workflow Execution',
    description: 'How studio workflows are triggered, loaded, and executed either via n8n webhooks or local simulation.',
    icon: Workflow,
    colorClass: 'text-blue-400 bg-blue-500/20',
    category: 'Core',
    nodes: studioWorkflowNodes,
    connections: studioWorkflowConnections,
    edgeFunctions: ['studio-run', 'execute-http', 'workflow-scheduler'],
    tables: ['studio_workflows', 'studio_executions', 'n8n_webhook_registry', 'workflow_schedules'],
  },
  {
    id: 'memory-service',
    title: 'Memory Service Pipeline',
    description: 'How chat messages are persisted, loaded, and assembled into LLM context across game and studio memory tables.',
    icon: Brain,
    colorClass: 'text-cyan-400 bg-cyan-500/20',
    category: 'Core',
    nodes: memoryServiceNodes,
    connections: memoryServiceConnections,
    edgeFunctions: ['npc-ai-chat'],
    tables: ['agent_memory', 'studio_agent_memory'],
  },

  // ── Content ──
  {
    id: 'lore-ingestion',
    title: 'Lore Ingestion',
    description: 'How lore entries are uploaded, chunked, embedded, and stored — plus how fragment discovery reveals lore progressively.',
    icon: BookOpen,
    colorClass: 'text-amber-400 bg-amber-500/20',
    category: 'Content',
    nodes: lorePipelineNodes,
    connections: lorePipelineConnections,
    edgeFunctions: ['extract-lore-text', 'embed-lore', 'decipher-fragment'],
    tables: ['world_lore_entries', 'lore_embeddings', 'fragment_archive'],
  },
  {
    id: 'lore-rag',
    title: 'Lore RAG Search',
    description: 'How user queries are embedded, matched against revealed lore chunks via pgvector, and fed to the Lorekeeper agent.',
    icon: Search,
    colorClass: 'text-orange-400 bg-orange-500/20',
    category: 'Content',
    nodes: loreRagNodes,
    connections: loreRagConnections,
    edgeFunctions: ['gemini-embed'],
    tables: ['lore_embeddings', 'world_lore_entries'],
  },

  // ── Game ──
  {
    id: 'game-objects',
    title: 'Game Object Actions',
    description: 'How player interactions with game objects route to n8n automations, plus the CRUD API for object management.',
    icon: Gamepad2,
    colorClass: 'text-emerald-400 bg-emerald-500/20',
    category: 'Game',
    nodes: gameObjectNodes,
    connections: gameObjectConnections,
    edgeFunctions: ['object-action', 'object-api'],
    tables: ['object_templates', 'object_instances', 'n8n_webhook_registry'],
  },
  {
    id: 'game-registry',
    title: 'Game Registry Sync',
    description: 'How the game server syncs maps, sprites, and spawn points to the registry, consumed by Studio dropdowns in real-time.',
    icon: Map,
    colorClass: 'text-teal-400 bg-teal-500/20',
    category: 'Game',
    nodes: gameRegistryNodes,
    connections: gameRegistryConnections,
    edgeFunctions: [],
    tables: ['game_registry'],
  },
  {
    id: 'realtime-broadcast',
    title: 'Realtime Broadcasting',
    description: 'How Studio actions propagate to the game client via Supabase Realtime channels for live NPC and lore sync.',
    icon: Radio,
    colorClass: 'text-indigo-400 bg-indigo-500/20',
    category: 'Game',
    nodes: realtimeNodes,
    connections: realtimeConnections,
    edgeFunctions: ['npc-ai-chat'],
    tables: ['agent_configs', 'fragment_archive'],
  },

  // ── Infrastructure ──
  {
    id: 'ai-services',
    title: 'AI Services',
    description: 'The AI provider routing layer — Gemini chat/embed/vision, Kimi fallback, and image generation.',
    icon: Sparkles,
    colorClass: 'text-rose-400 bg-rose-500/20',
    category: 'Infrastructure',
    nodes: aiServicesNodes,
    connections: aiServicesConnections,
    edgeFunctions: ['gemini-chat', 'gemini-embed', 'gemini-vision', 'kimi-chat', 'generate-image'],
    tables: ['studio_credentials'],
  },
  {
    id: 'authentication',
    title: 'Authentication Flow',
    description: 'How users sign in via Supabase Auth, maintain session state through AuthContext, and access protected routes.',
    icon: Shield,
    colorClass: 'text-sky-400 bg-sky-500/20',
    category: 'Infrastructure',
    nodes: authNodes,
    connections: authConnections,
    edgeFunctions: [],
    tables: ['profiles'],
  },
  {
    id: 'credential-mgmt',
    title: 'Credential Management',
    description: 'How API keys are encrypted with pgcrypto, stored securely, and decrypted at runtime for edge function use.',
    icon: KeyRound,
    colorClass: 'text-yellow-400 bg-yellow-500/20',
    category: 'Infrastructure',
    nodes: credentialNodes,
    connections: credentialConnections,
    edgeFunctions: ['manage-credential'],
    tables: ['studio_credentials'],
  },
  {
    id: 'workflow-scheduler',
    title: 'Workflow Scheduler',
    description: 'How pg_cron triggers the scheduler edge function to find due workflows, execute them, and update the next run time.',
    icon: Clock,
    colorClass: 'text-violet-400 bg-violet-500/20',
    category: 'Infrastructure',
    nodes: schedulerNodes,
    connections: schedulerConnections,
    edgeFunctions: ['workflow-scheduler', 'studio-run'],
    tables: ['workflow_schedules', 'workflow_templates', 'workflow_runs'],
  },
  {
    id: 'image-generation',
    title: 'Image Generation',
    description: 'How image requests flow through prompt validation, styling, and the Imagen 4.0 API to return generated images.',
    icon: ImageIcon,
    colorClass: 'text-pink-400 bg-pink-500/20',
    category: 'Infrastructure',
    nodes: imageGenNodes,
    connections: imageGenConnections,
    edgeFunctions: ['generate-image'],
    tables: [],
  },
];

// ── Game Design Scaffold Helper ───────────────────────────────────────────

const NODE_GAP_Y_SCAFFOLD = 200;

export function getGameScaffoldNodes(systemId: string): { nodes: NodeData[]; connections: Connection[] } {
  const diagram = SYSTEM_DIAGRAMS.find(d => d.id === systemId);
  if (!diagram) return { nodes: [], connections: [] };

  // Clone system nodes with prefixed IDs
  const clonedNodes: NodeData[] = diagram.nodes.map(n => ({
    ...n,
    id: `sys-${n.id}`,
  }));
  const clonedConnections: Connection[] = diagram.connections.map(c => ({
    ...c,
    id: `sys-${c.id}`,
    from: `sys-${c.from}`,
    to: `sys-${c.to}`,
  }));

  // Find the max row used by system nodes
  const maxY = Math.max(...diagram.nodes.map(n => n.position.y));
  const gameRowY = maxY + NODE_GAP_Y_SCAFFOLD;

  // Add game-specific nodes below system nodes
  const gameNodes: NodeData[] = [
    { id: 'game-picoclaw', type: 'picoclaw-agent' as any, position: { x: 0, y: gameRowY }, title: 'PicoClaw Agent', subtitle: 'Route to deployed agent', isConfigured: true },
    { id: 'game-show-text', type: 'game-show-text', position: { x: NODE_GAP_X, y: gameRowY }, title: 'Show Text', subtitle: 'Display in-game dialog', isConfigured: false },
    { id: 'game-give-item', type: 'game-give-item', position: { x: NODE_GAP_X * 2, y: gameRowY }, title: 'Give Item', subtitle: 'Reward player', isConfigured: false },
  ];

  // Find the last output node in the system diagram (usually the response/return node)
  const lastNode = diagram.nodes[diagram.nodes.length - 1];
  const gameConnections: Connection[] = [
    { id: 'gd1', from: `sys-${lastNode.id}`, to: 'game-picoclaw', fromPort: 'output', toPort: 'input' },
    { id: 'gd2', from: 'game-picoclaw', to: 'game-show-text', fromPort: 'output', toPort: 'input' },
    { id: 'gd3', from: 'game-show-text', to: 'game-give-item', fromPort: 'output', toPort: 'input' },
  ];

  return {
    nodes: [...clonedNodes, ...gameNodes],
    connections: [...clonedConnections, ...gameConnections],
  };
}
