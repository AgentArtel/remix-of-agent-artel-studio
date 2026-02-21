import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui-custom/Modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MemoryViewer } from './MemoryViewer';
import { useGameRegistry } from '@/hooks/useGameRegistry';
import type { Tables, Json } from '@/integrations/supabase/types';

type AgentConfig = Tables<'agent_configs'>;

interface NPCFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: AgentConfig | null;
}

const MODEL_OPTIONS = [
  'llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'llama3-70b-8192',
  'mixtral-8x7b-32768', 'gemma-7b-it',
  'gpt-4o-mini', 'gpt-4', 'gpt-3.5-turbo',
  'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro',
  'kimi-k2-0711-preview', 'kimi-k2.5',
];

// Hardcoded fallbacks used only when registry is empty
const FALLBACK_SPRITES = [
  { key: 'female', label: 'Female' },
  { key: 'hero', label: 'Hero' },
  { key: 'male', label: 'Male' },
];
const FALLBACK_CATEGORIES = [
  { key: 'npc', label: 'NPC' },
  { key: 'merchant', label: 'Merchant' },
  { key: 'quest', label: 'Quest Giver' },
  { key: 'guard', label: 'Guard' },
];
const FALLBACK_SKILLS = ['move', 'say', 'look', 'emote', 'wait'];

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

export const NPCFormModal: React.FC<NPCFormModalProps> = ({
  isOpen, onClose, onSave, initialData,
}) => {
  const isEditing = !!initialData;

  // Registry data
  const { data: registryMaps = [] } = useGameRegistry('map');
  const { data: registrySprites = [] } = useGameRegistry('sprite');
  const { data: registryCategories = [] } = useGameRegistry('category');
  const { data: registrySkills = [] } = useGameRegistry('skill');
  const { data: registrySpawnPoints = [] } = useGameRegistry('spawn_point');

  // Derived option lists (registry or fallback)
  const mapOptions = registryMaps.length > 0
    ? registryMaps.map((m) => ({ key: m.key, label: m.label }))
    : [];
  const spriteOptions = registrySprites.length > 0
    ? registrySprites.map((s) => ({ key: s.key, label: s.label }))
    : FALLBACK_SPRITES;
  const categoryOptions = registryCategories.length > 0
    ? registryCategories.map((c) => ({ key: c.key, label: c.label }))
    : FALLBACK_CATEGORIES;
  const skillOptions = registrySkills.length > 0
    ? registrySkills.map((s) => s.key)
    : FALLBACK_SKILLS;

  // Form state
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [icon, setIcon] = useState('🤖');
  const [sprite, setSprite] = useState('female');
  const [prompt, setPrompt] = useState('');
  const [description, setDescription] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you?');
  const [category, setCategory] = useState('npc');
  const [modelProvider, setModelProvider] = useState('groq');
  const [modelName, setModelName] = useState('llama-3.1-8b-instant');
  const [temperature, setTemperature] = useState(0.7);
  const [skills, setSkills] = useState<string[]>([...FALLBACK_SKILLS]);
  const [spawnMapId, setSpawnMapId] = useState('');
  const [spawnX, setSpawnX] = useState(0);
  const [spawnY, setSpawnY] = useState(0);
  const [useSpawnPreset, setUseSpawnPreset] = useState(false);
  const [manualMap, setManualMap] = useState(false);
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
      setModelProvider(m?.provider || 'groq');
      setModelName(m?.conversation || m?.model || 'llama-3.1-8b-instant');
      setTemperature(m?.temperature ?? 0.7);
      const sk = initialData.skills as any;
      setSkills(Array.isArray(sk) ? sk : [...FALLBACK_SKILLS]);
      const s = initialData.spawn_config as any;
      setSpawnMapId(s?.mapId || '');
      setSpawnX(s?.x ?? 0);
      setSpawnY(s?.y ?? 0);
      const b = initialData.behavior as any;
      setWander(b?.wander ?? false);
      setWanderRadius(b?.wanderRadius ?? 0);
      setIsEnabled(initialData.is_enabled ?? true);
      setManualMap(false);
      setUseSpawnPreset(false);
    } else {
      setName(''); setId(''); setIcon('🤖'); setSprite('female');
      setPrompt(''); setDescription(''); setWelcomeMessage('Hello! How can I help you?');
      setCategory('npc'); setModelProvider('groq'); setModelName('llama-3.1-8b-instant');
      setTemperature(0.7); setSkills([...FALLBACK_SKILLS]);
      setSpawnMapId(''); setSpawnX(0); setSpawnY(0);
      setWander(false); setWanderRadius(0); setIsEnabled(true);
      setManualMap(false); setUseSpawnPreset(false);
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

  const applySpawnPreset = (presetKey: string) => {
    const preset = registrySpawnPoints.find((p) => p.key === presetKey);
    if (preset?.metadata) {
      const meta = preset.metadata as any;
      if (meta.mapId) setSpawnMapId(meta.mapId);
      if (meta.x !== undefined) setSpawnX(meta.x);
      if (meta.y !== undefined) setSpawnY(meta.y);
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || !id.trim() || !prompt.trim()) return;
    onSave({
      id, name: name.trim(), prompt: prompt.trim(),
      description: description.trim() || null, icon,
      welcome_message: welcomeMessage, category,
      base_entity_type: 'ai-npc',
      appearance: { sprite } as unknown as Json,
      model: { provider: modelProvider, conversation: modelName, temperature } as unknown as Json,
      skills: skills as unknown as Json,
      spawn_config: { mapId: spawnMapId, x: spawnX, y: spawnY } as unknown as Json,
      behavior: { wander, wanderRadius, patrolPath: [] } as unknown as Json,
      is_enabled: isEnabled,
    });
  };

  const inputCls =
    'w-full px-4 py-2.5 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50';
  const labelCls = 'text-xs text-white/50 uppercase tracking-wider mb-1.5 block';

  const spawnPointsForMap = registrySpawnPoints.filter((sp) => {
    const meta = sp.metadata as any;
    return !spawnMapId || meta?.mapId === spawnMapId;
  });

  const renderFormFields = () => (
    <>
      {/* Identity */}
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
              {spriteOptions.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categoryOptions.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
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

      {/* Model */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Model</legend>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Provider</label>
            <select className={inputCls} value={modelProvider} onChange={(e) => setModelProvider(e.target.value)}>
              <option value="groq">Groq ⚡ Fastest</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="kimi">Kimi</option>
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

      {/* Skills */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Skills</legend>
        <div className="flex flex-wrap gap-2">
          {skillOptions.map((skill) => (
            <label key={skill} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-200 border border-white/10 cursor-pointer hover:border-green/30 transition-colors">
              <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="accent-green" />
              <span className="text-xs text-white/70">{skill}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Spawn Location */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-green mb-2">Spawn Location</legend>

        {/* Map selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelCls + ' mb-0'}>Map</label>
            {mapOptions.length > 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={manualMap} onChange={(e) => setManualMap(e.target.checked)} className="accent-green" />
                <span className="text-[10px] text-white/40">Manual entry</span>
              </label>
            )}
          </div>
          {manualMap || mapOptions.length === 0 ? (
            <input className={inputCls} value={spawnMapId} onChange={(e) => setSpawnMapId(e.target.value)} placeholder="e.g. simplemap" />
          ) : (
            <select className={inputCls} value={spawnMapId} onChange={(e) => setSpawnMapId(e.target.value)}>
              <option value="">— Select a map —</option>
              {mapOptions.map((m) => (
                <option key={m.key} value={m.key}>{m.label} ({m.key})</option>
              ))}
            </select>
          )}
        </div>

        {/* Spawn point presets */}
        {spawnPointsForMap.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelCls + ' mb-0'}>Spawn Point Preset</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={useSpawnPreset} onChange={(e) => setUseSpawnPreset(e.target.checked)} className="accent-green" />
                <span className="text-[10px] text-white/40">Use preset</span>
              </label>
            </div>
            {useSpawnPreset && (
              <select className={inputCls} onChange={(e) => applySpawnPreset(e.target.value)} defaultValue="">
                <option value="">— Pick a spawn point —</option>
                {spawnPointsForMap.map((sp) => {
                  const meta = sp.metadata as any;
                  return (
                    <option key={sp.key} value={sp.key}>
                      {sp.label} ({meta?.x ?? '?'}, {meta?.y ?? '?'})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        )}

        {/* Manual X/Y */}
        <div className="grid grid-cols-2 gap-3">
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

      {/* Behavior */}
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

      {/* Enabled toggle */}
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit NPC' : 'Create NPC'}
      description={isEditing ? "Update this NPC's configuration" : 'Define a new AI NPC for the game'} size="xl">
      {isEditing ? (
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="bg-dark-200 border border-white/10 mb-4">
            <TabsTrigger value="config" className="data-[state=active]:bg-green/10 data-[state=active]:text-green">Configuration</TabsTrigger>
            <TabsTrigger value="memory" className="data-[state=active]:bg-green/10 data-[state=active]:text-green">Memory</TabsTrigger>
          </TabsList>
          <TabsContent value="config">
            <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1">{renderFormFields()}</div>
            {renderFooter()}
          </TabsContent>
          <TabsContent value="memory">
            <MemoryViewer npcId={initialData!.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <div className="max-h-[70vh] overflow-y-auto space-y-5 pr-1">{renderFormFields()}</div>
          {renderFooter()}
        </>
      )}
    </Modal>
  );
};
