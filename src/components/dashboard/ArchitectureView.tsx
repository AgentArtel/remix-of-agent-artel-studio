import React from 'react';
import { ArrowDown, RotateCcw, Bot, Brain, Wrench, MessageSquare, Server, Sparkles, Globe, BookOpen, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Flow Diagram ──────────────────────────────────────────────────────────

interface FlowNodeProps { icon: React.ReactNode; title: string; desc: string; highlight?: boolean }

const FlowNode: React.FC<FlowNodeProps> = ({ icon, title, desc, highlight }) => (
  <div className={cn(
    'flex items-center gap-3 rounded-xl border px-5 py-3 w-full max-w-md mx-auto transition-colors',
    highlight ? 'border-accent-green/50 bg-accent-green/5' : 'border-border bg-card'
  )}>
    <div className={cn('flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', highlight ? 'bg-accent-green/20 text-accent-green' : 'bg-muted text-muted-foreground')}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </div>
);

const FlowArrow: React.FC<{ loop?: boolean }> = ({ loop }) => (
  <div className="flex flex-col items-center py-1">
    {loop ? <RotateCcw className="w-4 h-4 text-accent-green animate-spin" style={{ animationDuration: '4s' }} />
      : <ArrowDown className="w-4 h-4 text-muted-foreground" />}
  </div>
);

const SkillExecutionFlow: React.FC = () => (
  <div className="space-y-1">
    <h3 className="text-base font-semibold text-foreground mb-4">Skill Execution Flow</h3>
    <FlowNode icon={<MessageSquare className="w-4 h-4" />} title="User Message" desc="Player sends chat message to NPC" />
    <FlowArrow />
    <FlowNode icon={<Server className="w-4 h-4" />} title="npc-ai-chat Edge Function" desc="Receives request, validates session" highlight />
    <FlowArrow />
    <FlowNode icon={<Brain className="w-4 h-4" />} title="Load Agent Skills" desc="Query picoclaw_agent_skills + picoclaw_skills" />
    <FlowArrow />
    <FlowNode icon={<Wrench className="w-4 h-4" />} title="Build Tool Schemas" desc="Convert skill tools → OpenAI function schemas" highlight />
    <FlowArrow />
    <FlowNode icon={<Sparkles className="w-4 h-4" />} title="Call LLM with Tools" desc="Send messages + tool definitions to model" />
    <FlowArrow />
    <FlowNode icon={<Bot className="w-4 h-4" />} title="Tool Call Response?" desc="LLM returns tool_calls or final text" highlight />
    <FlowArrow loop />
    <FlowNode icon={<Wrench className="w-4 h-4" />} title="Execute Tool Handler" desc="Run handler (memory, search, image gen, etc.)" />
    <FlowArrow loop />
    <FlowNode icon={<Sparkles className="w-4 h-4" />} title="Feed Result → Re-call LLM" desc="Append tool result, loop until final response" />
    <FlowArrow />
    <FlowNode icon={<MessageSquare className="w-4 h-4" />} title="Final Response" desc="Return assistant message to client" highlight />
  </div>
);

// ── Edge Functions Registry ───────────────────────────────────────────────

interface EdgeFn { name: string; desc: string }

const edgeFunctionGroups: { label: string; icon: React.ReactNode; color: string; fns: EdgeFn[] }[] = [
  {
    label: 'AI', icon: <Sparkles className="w-4 h-4" />, color: 'text-purple-400 bg-purple-500/20',
    fns: [
      { name: 'gemini-chat', desc: 'Gemini text completions' },
      { name: 'gemini-embed', desc: 'Text embeddings via Gemini' },
      { name: 'gemini-vision', desc: 'Image analysis via Gemini' },
      { name: 'kimi-chat', desc: 'Kimi / Moonshot chat completions' },
      { name: 'npc-ai-chat', desc: 'NPC conversation handler with memory' },
      { name: 'generate-image', desc: 'AI image generation' },
    ],
  },
  {
    label: 'Game', icon: <Bot className="w-4 h-4" />, color: 'text-accent-green bg-accent-green/20',
    fns: [
      { name: 'object-action', desc: 'Execute object interaction actions' },
      { name: 'object-api', desc: 'CRUD API for game object instances' },
      { name: 'picoclaw-bridge', desc: 'Bridge to PicoClaw gateway (deploy, chat, status)' },
    ],
  },
  {
    label: 'Lore', icon: <BookOpen className="w-4 h-4" />, color: 'text-amber-400 bg-amber-500/20',
    fns: [
      { name: 'decipher-fragment', desc: 'Analyze and decode lore fragments' },
      { name: 'embed-lore', desc: 'Chunk and embed lore entries' },
      { name: 'extract-lore-text', desc: 'Extract text from uploaded lore files' },
    ],
  },
  {
    label: 'Studio', icon: <Workflow className="w-4 h-4" />, color: 'text-blue-400 bg-blue-500/20',
    fns: [
      { name: 'studio-run', desc: 'Workflow execution engine' },
      { name: 'workflow-scheduler', desc: 'Cron-based workflow scheduling' },
      { name: 'manage-credential', desc: 'Encrypted credential management' },
      { name: 'execute-http', desc: 'Proxy HTTP requests from workflows' },
    ],
  },
];

const EdgeFunctionsRegistry: React.FC = () => (
  <div className="space-y-6">
    <h3 className="text-base font-semibold text-foreground">Edge Functions Registry</h3>
    {edgeFunctionGroups.map(group => (
      <div key={group.label}>
        <div className="flex items-center gap-2 mb-3">
          <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg', group.color)}>{group.icon}</span>
          <span className="text-sm font-medium text-foreground">{group.label}</span>
          <span className="text-xs text-muted-foreground">({group.fns.length})</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {group.fns.map(fn => (
            <div key={fn.name} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0" title="Deployed" />
              <div className="min-w-0">
                <p className="text-sm font-mono text-foreground">{fn.name}</p>
                <p className="text-xs text-muted-foreground truncate">{fn.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────

export const ArchitectureView: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <SkillExecutionFlow />
    <EdgeFunctionsRegistry />
  </div>
);
