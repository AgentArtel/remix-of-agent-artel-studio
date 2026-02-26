import React, { useState, useMemo } from 'react';
import { useObjectTemplates, useObjectInstances, ObjectTemplate, ObjectInstance } from '@/hooks/useObjectTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, ToggleLeft, ToggleRight, Zap, Pencil, Trash2, Plus, MapPin } from 'lucide-react';
import { Modal } from '@/components/ui-custom/Modal';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormToggle } from '@/components/forms/FormToggle';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ObjectInstanceCard } from '@/components/map-entities/ObjectInstanceCard';
import { EntityMiniMap } from '@/components/map-entities/EntityMiniMap';

interface ObjectTemplatesProps {
  onNavigate: (page: string) => void;
}

/* ──────────────────── Template form defaults ──────────────────── */

const emptyTemplateForm = {
  id: '',
  name: '',
  icon: '📦',
  category: 'object',
  description: '',
  base_entity_type: 'object',
  default_sprite: '',
  is_enabled: true,
  actions: '{}',
};

/* ──────────────────── Instance form defaults ──────────────────── */

const emptyInstanceForm = {
  template_id: '',
  map_id: 'simplemap',
  position_x: 0,
  position_y: 0,
  custom_name: '',
  custom_config: '{}',
  is_enabled: true,
};

/* ──────────────────── Template Card ──────────────────── */

const ObjectTemplateCard: React.FC<{
  template: ObjectTemplate;
  onEdit: (t: ObjectTemplate) => void;
  onDelete: (id: string) => void;
}> = ({ template, onEdit, onDelete }) => {
  const actions = template.actions ? Object.entries(template.actions) : [];

  return (
    <div className="bg-dark-100 border border-white/10 rounded-2xl p-5 hover:border-green/30 transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-dark-200 flex items-center justify-center text-2xl">
            {template.icon || '📦'}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{template.name}</h3>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{template.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(template)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(template.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 ml-1">
            {template.is_enabled ? <ToggleRight className="w-5 h-5 text-green" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
            <span className={`text-xs ${template.is_enabled ? 'text-green' : 'text-muted-foreground'}`}>{template.is_enabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>
      </div>
      {template.description && <p className="text-sm text-muted-foreground mb-4">{template.description}</p>}
      {actions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Actions</p>
          {actions.map(([key, action]) => (
            <div key={key} className="bg-dark-200/60 rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm font-medium text-foreground">{key.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-6">{action.description}</p>
              {action.credentials && action.credentials.length > 0 && (
                <div className="flex gap-1.5 mt-2 ml-6">
                  {action.credentials.map((cred) => (
                    <span key={cred} className="text-[10px] bg-green/10 text-green border border-green/20 rounded-full px-2 py-0.5">{cred}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 text-[11px] text-muted-foreground">
        <span>Type: {template.base_entity_type}</span>
        {template.default_sprite && <span>Sprite: {template.default_sprite}</span>}
      </div>
    </div>
  );
};

/* ──────────────────── Main Component ──────────────────── */

export const ObjectTemplates: React.FC<ObjectTemplatesProps> = ({ onNavigate }) => {
  const { data: templates = [], isLoading: loadingTemplates } = useObjectTemplates(false);
  const { data: instances = [], isLoading: loadingInstances } = useObjectInstances();
  const queryClient = useQueryClient();

  // Template modal state
  const [tModalOpen, setTModalOpen] = useState(false);
  const [tEditingId, setTEditingId] = useState<string | null>(null);
  const [tForm, setTForm] = useState(emptyTemplateForm);
  const [tSaving, setTSaving] = useState(false);

  // Instance modal state
  const [iModalOpen, setIModalOpen] = useState(false);
  const [iEditingId, setIEditingId] = useState<string | null>(null);
  const [iForm, setIForm] = useState(emptyInstanceForm);
  const [iSaving, setISaving] = useState(false);

  /* ── Template CRUD ── */
  const openCreateTemplate = () => { setTEditingId(null); setTForm(emptyTemplateForm); setTModalOpen(true); };
  const openEditTemplate = (t: ObjectTemplate) => {
    setTEditingId(t.id);
    setTForm({ id: t.id, name: t.name, icon: t.icon || '📦', category: t.category, description: t.description || '', base_entity_type: t.base_entity_type, default_sprite: t.default_sprite || '', is_enabled: t.is_enabled ?? true, actions: JSON.stringify(t.actions || {}, null, 2) });
    setTModalOpen(true);
  };
  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm(`Delete template "${id}"?`)) return;
    await (supabase as any).from('object_templates').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['game-object-templates'] });
  };
  const handleSaveTemplate = async () => {
    if (!tForm.id || !tForm.name) return;
    setTSaving(true);
    let parsedActions: any = {};
    try { parsedActions = JSON.parse(tForm.actions); } catch { /* keep empty */ }
    const payload = { id: tForm.id, name: tForm.name, icon: tForm.icon, category: tForm.category, description: tForm.description || null, base_entity_type: tForm.base_entity_type, default_sprite: tForm.default_sprite || null, is_enabled: tForm.is_enabled, actions: parsedActions };
    if (tEditingId) {
      const { id: _, ...updatePayload } = payload;
      await (supabase as any).from('object_templates').update(updatePayload).eq('id', tEditingId);
    } else {
      await (supabase as any).from('object_templates').insert(payload);
    }
    queryClient.invalidateQueries({ queryKey: ['game-object-templates'] });
    setTSaving(false);
    setTModalOpen(false);
  };

  /* ── Instance CRUD ── */
  const openPlaceObject = () => { setIEditingId(null); setIForm({ ...emptyInstanceForm, template_id: templates[0]?.id || '' }); setIModalOpen(true); };
  const openEditInstance = (inst: ObjectInstance) => {
    setIEditingId(inst.id);
    setIForm({ template_id: inst.template_id, map_id: inst.map_id, position_x: inst.position.x, position_y: inst.position.y, custom_name: inst.custom_name || '', custom_config: JSON.stringify(inst.custom_config || {}, null, 2), is_enabled: inst.is_enabled ?? true });
    setIModalOpen(true);
  };
  const handleDeleteInstance = async (id: string) => {
    if (!window.confirm('Remove this object instance?')) return;
    await (supabase as any).from('object_instances').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['game-object-instances'] });
  };
  const handleSaveInstance = async () => {
    if (!iForm.template_id || !iForm.map_id) return;
    setISaving(true);
    let parsedConfig: any = {};
    try { parsedConfig = JSON.parse(iForm.custom_config); } catch { /* keep empty */ }
    const payload = { template_id: iForm.template_id, map_id: iForm.map_id, position: { x: iForm.position_x, y: iForm.position_y }, custom_name: iForm.custom_name || null, custom_config: parsedConfig, is_enabled: iForm.is_enabled };
    if (iEditingId) {
      await (supabase as any).from('object_instances').update(payload).eq('id', iEditingId);
    } else {
      await (supabase as any).from('object_instances').insert(payload);
    }
    queryClient.invalidateQueries({ queryKey: ['game-object-instances'] });
    setISaving(false);
    setIModalOpen(false);
  };

  /* ── Mini-map data ── */
  const instancesByMap = useMemo(() => {
    const map: Record<string, ObjectInstance[]> = {};
    instances.forEach((i) => { (map[i.map_id] = map[i.map_id] || []).push(i); });
    return map;
  }, [instances]);

  const templateMap = useMemo(() => {
    const m: Record<string, ObjectTemplate> = {};
    templates.forEach((t) => { m[t.id] = t; });
    return m;
  }, [templates]);

  const setTField = (key: string, value: any) => setTForm((f) => ({ ...f, [key]: value }));
  const setIField = (key: string, value: any) => setIForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-foreground">Object Templates</h1>
        <p className="text-sm text-muted-foreground mt-1">Game objects available for placement on maps</p>
      </div>

      <div className="px-6 pb-6">
        <Tabs defaultValue="templates">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="instances">Instances</TabsTrigger>
            </TabsList>
          </div>

          {/* ──────── Templates Tab ──────── */}
          <TabsContent value="templates">
            <div className="flex justify-end mb-4">
              <button onClick={openCreateTemplate} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Create Template
              </button>
            </div>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">Loading templates…</div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-lg font-medium">No object templates yet</p>
                <p className="text-sm mt-1">Click "Create Template" to add one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <ObjectTemplateCard key={t.id} template={t} onEdit={openEditTemplate} onDelete={handleDeleteTemplate} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ──────── Instances Tab ──────── */}
          <TabsContent value="instances">
            <div className="flex justify-end mb-4">
              <button onClick={openPlaceObject} disabled={templates.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors text-sm font-medium disabled:opacity-40">
                <MapPin className="w-4 h-4" /> Place Object
              </button>
            </div>

            {/* Mini-maps per map */}
            {Object.keys(instancesByMap).length > 0 && (
              <div className="flex flex-wrap gap-4 mb-6">
                {Object.entries(instancesByMap).map(([mapId, mapInstances]) => (
                  <EntityMiniMap
                    key={mapId}
                    mapId={mapId}
                    entities={mapInstances.map((i) => ({
                      id: i.id,
                      display_name: i.custom_name || templateMap[i.template_id]?.name || i.template_id,
                      entity_type: 'object',
                      position_x: i.position.x,
                      position_y: i.position.y,
                    }))}
                  />
                ))}
              </div>
            )}

            {loadingInstances ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">Loading instances…</div>
            ) : instances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <MapPin className="w-12 h-12 mb-3 opacity-40" />
                <p className="text-lg font-medium">No objects placed yet</p>
                <p className="text-sm mt-1">Click "Place Object" to add one to a map.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {instances.map((inst) => (
                  <ObjectInstanceCard key={inst.id} instance={inst} template={templateMap[inst.template_id]} onEdit={openEditInstance} onDelete={handleDeleteInstance} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ──────── Template Modal ──────── */}
      <Modal isOpen={tModalOpen} onClose={() => setTModalOpen(false)} title={tEditingId ? 'Edit Template' : 'Create Template'} size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="ID" value={tForm.id} onChange={(v) => setTField('id', v)} placeholder="e.g. mailbox" disabled={!!tEditingId} />
            <FormInput label="Name" value={tForm.name} onChange={(v) => setTField('name', v)} placeholder="e.g. Mailbox" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Icon" value={tForm.icon} onChange={(v) => setTField('icon', v)} placeholder="📦" />
            <FormInput label="Category" value={tForm.category} onChange={(v) => setTField('category', v)} placeholder="object" />
            <FormInput label="Base Entity Type" value={tForm.base_entity_type} onChange={(v) => setTField('base_entity_type', v)} placeholder="object" />
          </div>
          <FormInput label="Default Sprite" value={tForm.default_sprite} onChange={(v) => setTField('default_sprite', v)} placeholder="(optional)" />
          <FormTextarea label="Description" value={tForm.description} onChange={(v) => setTField('description', v)} placeholder="What does this object do?" rows={2} />
          <FormTextarea label="Actions (JSON)" value={tForm.actions} onChange={(v) => setTField('actions', v)} rows={6} monospace />
          <FormToggle label="Enabled" checked={tForm.is_enabled} onChange={(v) => setTField('is_enabled', v)} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
          <button onClick={() => setTModalOpen(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSaveTemplate} disabled={tSaving || !tForm.id || !tForm.name} className="px-5 py-2 rounded-xl bg-green text-dark text-sm font-medium hover:bg-green/90 transition-colors disabled:opacity-50">
            {tSaving ? 'Saving…' : tEditingId ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>

      {/* ──────── Instance Modal ──────── */}
      <Modal isOpen={iModalOpen} onClose={() => setIModalOpen(false)} title={iEditingId ? 'Edit Instance' : 'Place Object'} size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Template dropdown */}
          <div className="space-y-2">
            <label className="text-xs text-white/40 uppercase tracking-wider block">Template</label>
            <select
              value={iForm.template_id}
              onChange={(e) => setIField('template_id', e.target.value)}
              disabled={!!iEditingId}
              className="w-full px-4 py-3 rounded-xl bg-dark-200 border border-white/5 text-sm text-white/80 focus:outline-none focus:border-green/50 transition-all disabled:opacity-50"
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.icon} {t.name} ({t.id})</option>
              ))}
            </select>
          </div>

          <FormInput label="Map ID" value={iForm.map_id} onChange={(v) => setIField('map_id', v)} placeholder="e.g. simplemap" />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-white/40 uppercase tracking-wider block">Position X</label>
              <input type="number" value={iForm.position_x} onChange={(e) => setIField('position_x', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-dark-200 border border-white/5 text-sm text-white/80 focus:outline-none focus:border-green/50 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/40 uppercase tracking-wider block">Position Y</label>
              <input type="number" value={iForm.position_y} onChange={(e) => setIField('position_y', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl bg-dark-200 border border-white/5 text-sm text-white/80 focus:outline-none focus:border-green/50 transition-all" />
            </div>
          </div>

          <FormInput label="Custom Name (optional)" value={iForm.custom_name} onChange={(v) => setIField('custom_name', v)} placeholder="Override display name" />
          <FormTextarea label="Custom Config (JSON)" value={iForm.custom_config} onChange={(v) => setIField('custom_config', v)} rows={4} monospace />
          <FormToggle label="Enabled" checked={iForm.is_enabled} onChange={(v) => setIField('is_enabled', v)} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
          <button onClick={() => setIModalOpen(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={handleSaveInstance} disabled={iSaving || !iForm.template_id || !iForm.map_id} className="px-5 py-2 rounded-xl bg-green text-dark text-sm font-medium hover:bg-green/90 transition-colors disabled:opacity-50">
            {iSaving ? 'Saving…' : iEditingId ? 'Update' : 'Place'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
