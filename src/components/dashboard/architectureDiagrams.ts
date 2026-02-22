import type { NodeData, Connection } from '@/types';
import { Bot, Workflow, BookOpen, Sparkles, Gamepad2, Database, type LucideIcon } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SystemDiagram {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
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

// ── 4. Lore Pipeline ──────────────────────────────────────────────────────

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

// ── 5. Game Object Actions ────────────────────────────────────────────────

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

// ── 6. AI Services ────────────────────────────────────────────────────────

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

// ── Export All Diagrams ───────────────────────────────────────────────────

export const SYSTEM_DIAGRAMS: SystemDiagram[] = [
  {
    id: 'npc-chat',
    title: 'NPC Chat Pipeline',
    description: 'How player chat messages reach an NPC, get routed to an LLM, and return a response with memory persistence.',
    icon: Bot,
    colorClass: 'text-primary bg-primary/20',
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
    nodes: studioWorkflowNodes,
    connections: studioWorkflowConnections,
    edgeFunctions: ['studio-run', 'execute-http', 'workflow-scheduler'],
    tables: ['studio_workflows', 'studio_executions', 'n8n_webhook_registry', 'workflow_schedules'],
  },
  {
    id: 'lore-pipeline',
    title: 'Lore Pipeline',
    description: 'How lore entries are uploaded, chunked, embedded, and stored — plus how fragment discovery reveals lore progressively.',
    icon: BookOpen,
    colorClass: 'text-amber-400 bg-amber-500/20',
    nodes: lorePipelineNodes,
    connections: lorePipelineConnections,
    edgeFunctions: ['extract-lore-text', 'embed-lore', 'decipher-fragment'],
    tables: ['world_lore_entries', 'lore_embeddings', 'fragment_archive'],
  },
  {
    id: 'game-objects',
    title: 'Game Object Actions',
    description: 'How player interactions with game objects route to n8n automations, plus the CRUD API for object management.',
    icon: Gamepad2,
    colorClass: 'text-emerald-400 bg-emerald-500/20',
    nodes: gameObjectNodes,
    connections: gameObjectConnections,
    edgeFunctions: ['object-action', 'object-api'],
    tables: ['object_templates', 'object_instances', 'n8n_webhook_registry'],
  },
  {
    id: 'ai-services',
    title: 'AI Services',
    description: 'The AI provider routing layer — Gemini chat/embed/vision, Kimi fallback, and image generation.',
    icon: Sparkles,
    colorClass: 'text-rose-400 bg-rose-500/20',
    nodes: aiServicesNodes,
    connections: aiServicesConnections,
    edgeFunctions: ['gemini-chat', 'gemini-embed', 'gemini-vision', 'kimi-chat', 'generate-image'],
    tables: ['studio_credentials'],
  },
];
