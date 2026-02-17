import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui-custom/Modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MemoryViewer } from './MemoryViewer';
import type { Tables, Json } from '@/integrations/supabase/types';

type AgentConfig = Tables<'agent_configs'>;

interface NPCFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: AgentConfig | null;
}

const MODEL_OPTIONS = [
  'kimi-k2-0711-preview',
  'kimi-k2.5',
  'gpt-4',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
];

const GAME_SKILLS = ['move', 'say', 'look', 'emote', 'wait'];

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

export const NPCFormModal: React.FC<NPCFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEditing = !!initialData;

  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [sprite, setSprite] = useState('female');
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you?');
  const [category, setCategory] = useState('npc');
  const [modelProvider, setModelProvider] = useState('openai');
  const [modelName, setModelName] = useState('gpt-4');
  const [temperature, setTemperature] = useState(0.7);
  const [skills, setSkills] = useState<string[]>([...GAME_SKILLS]);
  const [spawnMapId, setSpawnMapId] = useState('main');
  const [spawnX, setSpawnX] = useState(0);
  const [spawnY, setSpawnY] = useState(0);
  const [wander, setWander] = useState(false);
  const [wanderRadius, setWanderRadius] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setName(initialData.name);
      setId(initialData.id);
      setIcon(initialData.icon || '🤖');
      const app = initialData.appearance as any;
      setSprite(app?.sprite || initialData.default_sprite || 'female');
      setPrompt(initialData.prompt);
      setDescription(initialData.description || '');
      setWelcomeMessage(initialData.welcome_message || 'Hello! How can I help you?');
      setCategory(initialData.category || 'npc');
      const m = initialData.model as any;
      setModelProvider(m?.provider || 'openai');
      setModelName(m?.model || 'gpt-4');
      setTemperature(m?.temperature ?? 0.7);
      const sk = initialData.skills as any;
      setSkills(Array.isArray(sk) ? sk : [...GAME_SKILLS]);
      const s = initialData.spawn_config as any;
      setSpawnMapId(s?.mapId || 'main');
      setSpawnX(s?.x ?? 0);
      setSpawnY(s?.y ?? 0);
      const b = initialData.behavior as any;
      setWander(b?.wander ?? false);
      setWanderRadius(b?.wanderRadius ?? 0);
      setIsEnabled(initialData.is_enabled ?? true);
    } else {
      setName(''); setId(''); setIcon('🤖'); setSprite('female');
      setPrompt(''); setDescription(''); setWelcomeMessage('Hello! How can I help you?');
      setCategory('npc'); setModelProvider('openai'); setModelName('gpt-4');
      setTemperature(0.7); setSkills([...GAME_SKILLS]);
      setSpawnMapId('main'); setSpawnX(0); setSpawnY(0);
      setWander(false); setWanderRadius(0); setIsEnabled(true);
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (!isEditing && name) setId(slugify(name));
  }, [name, isEditing]);

  const toggleSkill = (skillName: string) => {
    setSkills((prev) =>
      prev.includes(skillName) ? prev.filter((s) => s !== skillName) : [...prev, skillName]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || !id.trim() || !prompt.trim()) return;
    onSave({
      id,
      name: name.trim(),
      prompt: prompt.trim(),
      description: description.trim() || null,
      icon,
      welcome_message: welcomeMessage,
      category,
      base_entity_type: 'ai-npc',
      appearance: { sprite } as unknown as Json,
      model: { provider: modelProvider, model: modelName, temperature } as unknown as Json,
      skills: skills as unknown as Json,
      spawn_config: { mapId: spawnMapId, x: spawnX, y: spawnY } as unknown as Json,
      behavior: { wander, wanderRadius, patrolPath: [] } as unknown as Json,
      is_enabled: isEnabled,
    });
  };

  const inputCls =
    'w-full px-4 py-2.5 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50';
  const labelCls = 'text-xs text-white/50 uppercase tracking-wider mb-1.5 block';

  const renderFormFields = () => (
    <>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Identity</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Name</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Elder Theron" />
          </div>
          <div>
            <label className={labelCls}>ID</label>
            <input className={inputCls} value={id} onChange={(e) => !isEditing && setId(e.target.value)} readOnly={isEditing} placeholder="auto-generated" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Icon</label>
            <input className={inputCls} value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🤖" />
          </div>
          <div>
            <label className={labelCls}>Sprite</label>
            <select className={inputCls} value={sprite} onChange={(e) => setSprite(e.target.value)}>
              <option value="female">Female</option>
              <option value="hero">Hero</option>
              <option value="male">Male</option>
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="npc">NPC</option>
            <option value="merchant">Merchant</option>
            <option value="quest">Quest Giver</option>
            <option value="guard">Guard</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A wise village elder..." />
        </div>
        <div>
          <label className={labelCls}>System Prompt</label>
          <textarea className={`${inputCls} min-h-[100px]`} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="You are a wise village elder..." rows={4} />
        </div>
        <div>
          <label className={labelCls}>Welcome Message</label>
          <input className={inputCls} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} placeholder="Hello! How can I help you?" />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Model</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Provider</label>
            <select className={inputCls} value={modelProvider} onChange={(e) => setModelProvider(e.target.value)}>
              <option value="openai">OpenAI</option>
              <option value="kimi">Kimi</option>
              <option value="gemini">Gemini</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Model</label>
            <select className={inputCls} value={modelName} onChange={(e) => setModelName(e.target.value)}>
              {MODEL_OPTIONS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Temperature</label>
            <input className={inputCls} type="number" step="0.1" min="0" max="2" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Skills</legend>
        <div className="flex flex-wrap gap-2">
          {GAME_SKILLS.map((skill) => (
            <label key={skill} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-200 border border-white/10 cursor-pointer hover:border-green/30 transition-colors">
              <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="accent-green" />
              <span className="text-xs text-white/70">{skill}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Spawn Location</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Map ID</label>
            <input className={inputCls} value={spawnMapId} onChange={(e) => setSpawnMapId(e.target.value)} placeholder="main" />
          </div>
          <div>
            <label className={labelCls}>X</label>
            <input className={inputCls} type="number" value={spawnX} onChange={(e) => setSpawnX(Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Y</label>
            <input className={inputCls} type="number" value={spawnY} onChange={(e) => setSpawnY(Number(e.target.value))} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Behavior</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={wander} onChange={(e) => setWander(e.target.checked)} className="accent-green" />
              <span className="text-xs text-white/70">Wander</span>
            </label>
          </div>
          <div>
            <label className={labelCls}>Wander Radius</label>
            <input className={inputCls} type="number" value={wanderRadius} onChange={(e) => setWanderRadius(Number(e.target.value))} />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} className="accent-green" />
          <span className="text-sm text-white/70">Enabled</span>
        </label>
        <span className="text-xs text-white/30">(disabled NPCs don't load in the game)</span>
      </div>
    </>
  );

  const renderFooter = () => (
    <div className="flex justify-end gap-3 pt-5 border-t border-white/5 mt-5">
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button className="bg-green text-dark hover:bg-green-light" onClick={handleSubmit} disabled={!name.trim() || !id.trim() || !prompt.trim()}>
        {isEditing ? 'Save Changes' : 'Create NPC'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit NPC' : 'Create NPC'}
      description={isEditing ? "Update this NPC's configuration" : 'Define a new AI NPC for the game'}
      size="xl"
    >
      {isEditing ? (
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="bg-dark-200 border border-white/10 mb-4">
            <TabsTrigger value="config" className="data-[state=active]:bg-green/10 data-[state=active]:text-green">Configuration</TabsTrigger>
            <TabsTrigger value="memory" className="data-[state=active]:bg-green/10 data-[state=active]:text-green">Memory</TabsTrigger>
          </TabsList>
          <TabsContent value="config">
            <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1">
              {renderFormFields()}
            </div>
            {renderFooter()}
          </TabsContent>
          <TabsContent value="memory">
            <MemoryViewer npcId={initialData!.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1">
            {renderFormFields()}
          </div>
          {renderFooter()}
        </>
      )}
    </Modal>
  );
};
