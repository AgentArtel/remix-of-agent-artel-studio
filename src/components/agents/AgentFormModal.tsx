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
import { Save, X, Plus, Trash2 } from 'lucide-react';
import type { PicoClawAgent, PicoClawSkill, CreateAgentInput } from '@/hooks/usePicoClawAgents';

// ---------------------------------------------------------------------------
// LLM backend/model options
// ---------------------------------------------------------------------------

const LLM_BACKENDS = [
  {
    group: 'Fast & Free-tier',
    models: [
      { backend: 'groq', model: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq)' },
      { backend: 'groq', model: 'llama-3.1-70b-versatile', label: 'Llama 3.1 70B (Groq)' },
      { backend: 'groq', model: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Groq)' },
      { backend: 'cerebras', model: 'llama-3.1-70b', label: 'Llama 3.1 70B (Cerebras)' },
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
    }
  }, [isOpen, initialData]);

  const handleModelSelect = (value: string) => {
    // value = "backend:model"
    const [b, ...rest] = value.split(':');
    setLlmBackend(b);
    setLlmModel(rest.join(':'));
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
          <DialogTitle className="text-white">
            {isEditing ? `Edit Agent: ${initialData.picoclaw_agent_id}` : 'Create Agent'}
          </DialogTitle>
        </DialogHeader>

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
