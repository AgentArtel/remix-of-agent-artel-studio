import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Save, X, Plus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { geminiChat } from '@/lib/geminiServices';
import type { PicoClawAgent, PicoClawSkill, CreateAgentInput } from '@/hooks/usePicoClawAgents';

// ---------------------------------------------------------------------------
// LLM backend/model options
// ---------------------------------------------------------------------------

const LLM_BACKENDS = [
  {
    group: 'Fast & Free-tier',
    models: [
      { backend: 'groq', model: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
      { backend: 'groq', model: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq)' },
      { backend: 'groq', model: 'llama3-70b-8192', label: 'Llama 3 70B (Groq)' },
      { backend: 'cerebras', model: 'llama-3.3-70b', label: 'Llama 3.3 70B (Cerebras)' },
    ],
  },
  {
    group: 'OpenAI',
    models: [
      { backend: 'openai', model: 'gpt-4o', label: 'GPT-4o' },
      { backend: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    ],
  },
  {
    group: 'Anthropic',
    models: [
      { backend: 'anthropic', model: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
      { backend: 'anthropic', model: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    ],
  },
  {
    group: 'Google',
    models: [
      { backend: 'gemini', model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
      { backend: 'gemini', model: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    ],
  },
  {
    group: 'DeepSeek',
    models: [
      { backend: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek Chat' },
    ],
  },
  {
    group: 'Local',
    models: [
      { backend: 'ollama', model: 'llama3.1', label: 'Ollama (local)' },
    ],
  },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Quick Create system prompt
// ---------------------------------------------------------------------------

const QUICK_CREATE_PROMPT = `You are a PicoClaw agent configuration generator. Given a description of what kind of AI agent the user wants, generate a complete PicoClaw agent configuration as JSON.

Return ONLY a JSON object with these fields:

{
  "name": "Human-readable agent name (e.g. Elder Theron)",
  "soul_md": "Markdown content for SOUL.md",
  "identity_md": "Markdown content for IDENTITY.md",
  "user_md": "Markdown content for USER.md",
  "agents_md": "Markdown content for AGENTS.md",
  "llm_backend": "one of: groq, gemini, anthropic, openai, deepseek, ollama",
  "llm_model": "specific model ID from the valid options below",
  "temperature": 0.7,
  "max_tokens": 4096,
  "max_tool_iterations": 20,
  "memory_enabled": true,
  "long_term_memory_enabled": true
}

## SOUL.md Format
## Personality
- Trait 1
- Trait 2

## Values
- Value 1
- Value 2

## Communication Style
- Style guideline 1

## Quirks
- Quirk 1

## IDENTITY.md Format
# [Agent Name]

## Description
One paragraph describing who this agent is.

## Purpose
What this agent's primary function is.

## Background
Relevant backstory or context.

## Capabilities
- Capability 1
- Capability 2

## Constraints
- Constraint 1

## USER.md
Describe the typical user/player who interacts with this agent and how they interact.

## AGENTS.md
Behavioral directives as a bulleted list:
- Always stay in character
- Never reveal you are an AI
- (other rules specific to the agent type)

## Valid LLM Options (pick one)
- groq / llama-3.1-70b-versatile (creative, conversational)
- groq / llama-3.1-8b-instant (fast, simple)
- groq / mixtral-8x7b-32768 (multilingual)
- cerebras / llama-3.1-70b (fast inference)
- gemini / gemini-2.5-flash (analytical, factual)
- gemini / gemini-2.5-pro (complex reasoning)
- anthropic / claude-sonnet-4-6 (nuanced reasoning)
- anthropic / claude-haiku-4-5 (fast, cheap)
- deepseek / deepseek-chat (coding/technical)
- openai / gpt-4o (general purpose)

## Temperature Guidelines
- 0.3-0.5: Factual, consistent (merchants, guides, databases)
- 0.6-0.8: Balanced (NPCs, assistants)
- 0.9-1.2: Creative, unpredictable (storytellers, jesters)

## Rules
1. Generate rich, detailed markdown for soul_md and identity_md (at least 8-10 lines each)
2. Make the personality distinct and memorable
3. Choose LLM backend/model that fits the agent's purpose
4. Set temperature appropriate for the agent's role
5. Prefer groq or gemini backends unless the description suggests otherwise`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AgentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateAgentInput | (Partial<PicoClawAgent> & { id: string })) => void;
  initialData: PicoClawAgent | null;
  skills: PicoClawSkill[];
  assignedSkillIds: string[];
  onAssignSkill: (skillId: string) => void;
  onRemoveSkill: (skillId: string) => void;
}

export const AgentFormModal: React.FC<AgentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  skills,
  assignedSkillIds,
  onAssignSkill,
  onRemoveSkill,
}) => {
  const isEditing = !!initialData;

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [soulMd, setSoulMd] = useState('');
  const [identityMd, setIdentityMd] = useState('');
  const [userMd, setUserMd] = useState('');
  const [agentsMd, setAgentsMd] = useState('');
  const [llmBackend, setLlmBackend] = useState('groq');
  const [llmModel, setLlmModel] = useState('llama-3.1-8b-instant');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [maxToolIterations, setMaxToolIterations] = useState(20);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [longTermMemory, setLongTermMemory] = useState(true);

  // Quick Create state
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickDescription, setQuickDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.picoclaw_agent_id);
      setSlug(initialData.picoclaw_agent_id);
      setSoulMd(initialData.soul_md || '');
      setIdentityMd(initialData.identity_md || '');
      setUserMd(initialData.user_md || '');
      setAgentsMd(initialData.agents_md || '');
      setLlmBackend(initialData.llm_backend || 'groq');
      setLlmModel(initialData.llm_model || 'llama-3.1-8b-instant');
      setTemperature(Number(initialData.temperature) || 0.7);
      setMaxTokens(initialData.max_tokens || 4096);
      setMaxToolIterations(initialData.max_tool_iterations || 20);
      setMemoryEnabled(initialData.memory_enabled ?? true);
      setLongTermMemory(initialData.long_term_memory_enabled ?? true);
    } else if (isOpen) {
      setName('');
      setSlug('');
      setSoulMd('');
      setIdentityMd('');
      setUserMd('');
      setAgentsMd('');
      setLlmBackend('groq');
      setLlmModel('llama-3.1-8b-instant');
      setTemperature(0.7);
      setMaxTokens(4096);
      setMaxToolIterations(20);
      setMemoryEnabled(true);
      setLongTermMemory(true);
      setShowQuickCreate(false);
      setQuickDescription('');
      setIsGenerating(false);
    }
  }, [isOpen, initialData]);

  const handleModelSelect = (value: string) => {
    // value = "backend:model"
    const [b, ...rest] = value.split(':');
    setLlmBackend(b);
    setLlmModel(rest.join(':'));
  };

  const handleQuickCreate = async () => {
    if (!quickDescription.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const result = await geminiChat({
        model: 'gemini-2.5-flash',
        temperature: 0.7,
        maxTokens: 4096,
        responseMimeType: 'application/json',
        systemPrompt: QUICK_CREATE_PROMPT,
        messages: [{ role: 'user', content: quickDescription.trim() }],
      });

      if (!result.success || !result.text) {
        throw new Error(result.message || result.error || 'Generation failed');
      }

      // Strip markdown code fences if the LLM wraps JSON in ```json ... ```
      let raw = result.text.trim();
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      const config = JSON.parse(raw);

      if (config.name) {
        setName(config.name);
        setSlug(slugify(config.name));
      }
      if (config.soul_md) setSoulMd(config.soul_md);
      if (config.identity_md) setIdentityMd(config.identity_md);
      if (config.user_md) setUserMd(config.user_md);
      if (config.agents_md) setAgentsMd(config.agents_md);
      if (config.llm_backend) setLlmBackend(config.llm_backend);
      if (config.llm_model) setLlmModel(config.llm_model);
      if (config.temperature !== undefined) setTemperature(config.temperature);
      if (config.max_tokens !== undefined) setMaxTokens(config.max_tokens);
      if (config.max_tool_iterations !== undefined) setMaxToolIterations(config.max_tool_iterations);
      if (config.memory_enabled !== undefined) setMemoryEnabled(config.memory_enabled);
      if (config.long_term_memory_enabled !== undefined) setLongTermMemory(config.long_term_memory_enabled);

      setShowQuickCreate(false);
      toast.success('Agent config generated! Review and tweak before saving.');
    } catch (err) {
      console.error('[QuickCreate] Error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate agent config');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const finalSlug = slug || slugify(name);
    if (!finalSlug) return;

    if (isEditing && initialData) {
      onSave({
        id: initialData.id,
        picoclaw_agent_id: finalSlug,
        soul_md: soulMd,
        identity_md: identityMd,
        user_md: userMd,
        agents_md: agentsMd,
        llm_backend: llmBackend,
        llm_model: llmModel,
        temperature,
        max_tokens: maxTokens,
        max_tool_iterations: maxToolIterations,
        memory_enabled: memoryEnabled,
        long_term_memory_enabled: longTermMemory,
      });
    } else {
      onSave({
        picoclaw_agent_id: finalSlug,
        soul_md: soulMd,
        identity_md: identityMd,
        user_md: userMd,
        agents_md: agentsMd,
        llm_backend: llmBackend,
        llm_model: llmModel,
        temperature,
        max_tokens: maxTokens,
        max_tool_iterations: maxToolIterations,
        memory_enabled: memoryEnabled,
        long_term_memory_enabled: longTermMemory,
      });
    }
  };

  const assignedSkills = skills.filter((s) => assignedSkillIds.includes(s.id));
  const availableSkills = skills.filter((s) => !assignedSkillIds.includes(s.id));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col bg-dark-100 border-white/10">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">
              {isEditing ? `Edit Agent: ${initialData.picoclaw_agent_id}` : 'Create Agent'}
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickCreate(!showQuickCreate)}
                className="text-green/70 hover:text-green hover:bg-green/10"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Quick Create
              </Button>
            )}
          </div>
        </DialogHeader>

        {showQuickCreate && !isEditing && (
          <div className="bg-green/5 border border-green/20 rounded-lg p-4 space-y-3">
            <p className="text-xs text-white/50">
              Describe the agent you want and AI will generate the full configuration.
            </p>
            <Textarea
              value={quickDescription}
              onChange={(e) => setQuickDescription(e.target.value)}
              placeholder="A wise village elder who speaks in riddles, guards ancient knowledge, and helps players on quests..."
              className="bg-dark-200 border-white/10 min-h-[80px] text-sm"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickCreate(false)}
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-green text-dark hover:bg-green-light"
                onClick={handleQuickCreate}
                disabled={!quickDescription.trim() || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <Tabs defaultValue="identity" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-dark-200 border border-white/5 shrink-0">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="soul">Soul</TabsTrigger>
            <TabsTrigger value="llm">LLM</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {/* ---- Identity Tab ---- */}
            <TabsContent value="identity" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!isEditing) setSlug(slugify(e.target.value));
                  }}
                  placeholder="Elder Theron"
                  className="bg-dark-200 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label>Agent Slug (ID)</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="elder-theron"
                  className="bg-dark-200 border-white/10 font-mono text-sm"
                />
                <p className="text-[11px] text-white/30">
                  Unique identifier used in PicoClaw config and API calls
                </p>
              </div>
              <div className="space-y-2">
                <Label>Identity (IDENTITY.md)</Label>
                <Textarea
                  value={identityMd}
                  onChange={(e) => setIdentityMd(e.target.value)}
                  placeholder="You are Elder Theron, a wise sage who has lived for 300 years in the village of Astral Peaks..."
                  className="bg-dark-200 border-white/10 min-h-[120px] font-mono text-sm"
                />
                <p className="text-[11px] text-white/30">
                  Who this agent is: role, background, knowledge, and context
                </p>
              </div>
            </TabsContent>

            {/* ---- Soul Tab ---- */}
            <TabsContent value="soul" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Soul (SOUL.md)</Label>
                <Textarea
                  value={soulMd}
                  onChange={(e) => setSoulMd(e.target.value)}
                  placeholder="## Personality\n- Wise and patient\n- Speaks in riddles\n- Values knowledge above all\n\n## Communication Style\n- Uses archaic language\n- Often quotes ancient texts"
                  className="bg-dark-200 border-white/10 min-h-[200px] font-mono text-sm"
                />
                <p className="text-[11px] text-white/30">
                  Personality, values, communication style, quirks, and behavioral guidelines
                </p>
              </div>
              <div className="space-y-2">
                <Label>User Context (USER.md)</Label>
                <Textarea
                  value={userMd}
                  onChange={(e) => setUserMd(e.target.value)}
                  placeholder="The user is a player in an RPG game. They interact with you through dialog choices."
                  className="bg-dark-200 border-white/10 min-h-[80px] font-mono text-sm"
                />
                <p className="text-[11px] text-white/30">
                  Context about who the agent serves and how they interact
                </p>
              </div>
              <div className="space-y-2">
                <Label>Behavior Directives (AGENTS.md)</Label>
                <Textarea
                  value={agentsMd}
                  onChange={(e) => setAgentsMd(e.target.value)}
                  placeholder="- Always stay in character\n- Never reveal you are an AI\n- Use game tools to affect the world"
                  className="bg-dark-200 border-white/10 min-h-[80px] font-mono text-sm"
                />
              </div>
            </TabsContent>

            {/* ---- LLM Tab ---- */}
            <TabsContent value="llm" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Model</Label>
                <Select
                  value={`${llmBackend}:${llmModel}`}
                  onValueChange={handleModelSelect}
                >
                  <SelectTrigger className="bg-dark-200 border-white/10">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent className="bg-dark-200 border-white/10">
                    {LLM_BACKENDS.map((group) => (
                      <SelectGroup key={group.group}>
                        <SelectLabel className="text-white/40">{group.group}</SelectLabel>
                        {group.models.map((m) => (
                          <SelectItem
                            key={`${m.backend}:${m.model}`}
                            value={`${m.backend}:${m.model}`}
                          >
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Temperature: {temperature.toFixed(2)}</Label>
                <Slider
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v)}
                  min={0}
                  max={2}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-[11px] text-white/30">
                  Higher = more creative, lower = more focused
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="bg-dark-200 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Tool Iterations</Label>
                  <Input
                    type="number"
                    value={maxToolIterations}
                    onChange={(e) => setMaxToolIterations(Number(e.target.value))}
                    className="bg-dark-200 border-white/10"
                  />
                </div>
              </div>
            </TabsContent>

            {/* ---- Skills Tab ---- */}
            <TabsContent value="skills" className="space-y-4 mt-0">
              {assignedSkills.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Skills</Label>
                  <div className="space-y-1">
                    {assignedSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-200 border border-white/5"
                      >
                        <div>
                          <span className="text-sm text-white">{skill.name}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {skill.category}
                          </Badge>
                        </div>
                        <button
                          onClick={() => onRemoveSkill(skill.id)}
                          className="text-white/40 hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {availableSkills.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Skills</Label>
                  <div className="space-y-1">
                    {availableSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-200/50 border border-white/5"
                      >
                        <div>
                          <span className="text-sm text-white/60">{skill.name}</span>
                          <Badge variant="outline" className="ml-2 text-[10px]">
                            {skill.category}
                          </Badge>
                          <p className="text-[11px] text-white/30">{skill.description}</p>
                        </div>
                        <button
                          onClick={() => onAssignSkill(skill.id)}
                          className="text-white/40 hover:text-green transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {skills.length === 0 && (
                <p className="text-sm text-white/40 text-center py-8">
                  No skills available. Run the migration to seed built-in skills.
                </p>
              )}
            </TabsContent>

            {/* ---- Memory Tab ---- */}
            <TabsContent value="memory" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Session Memory</Label>
                  <p className="text-[11px] text-white/30">
                    Remember conversation history within a session
                  </p>
                </div>
                <Switch checked={memoryEnabled} onCheckedChange={setMemoryEnabled} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Long-term Memory</Label>
                  <p className="text-[11px] text-white/30">
                    Persist important facts to MEMORY.md across sessions
                  </p>
                </div>
                <Switch checked={longTermMemory} onCheckedChange={setLongTermMemory} />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5 shrink-0">
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button
            className="bg-green text-dark hover:bg-green-light"
            onClick={handleSave}
            disabled={!slug && !name}
          >
            <Save className="w-4 h-4 mr-1" /> {isEditing ? 'Save' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
