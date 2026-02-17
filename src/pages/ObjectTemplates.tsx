import React, { useState } from 'react';
import { useObjectTemplates, ObjectTemplate } from '@/hooks/useObjectTemplates';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, ToggleLeft, ToggleRight, Zap, Pencil, Trash2, Plus } from 'lucide-react';
import { Modal } from '@/components/ui-custom/Modal';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormToggle } from '@/components/forms/FormToggle';

interface ObjectTemplatesProps {
  onNavigate: (page: string) => void;
}

const emptyForm = {
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

const ObjectTemplateCard: React.FC<{
  template: ObjectTemplate;
  onEdit: (t: ObjectTemplate) => void;
  onDelete: (id: string) => void;
}> = ({ template, onEdit, onDelete }) => {
  const actions = template.actions ? Object.entries(template.actions) : [];

  return (
    <div className="bg-dark-100 border border-white/10 rounded-2xl p-5 hover:border-green/30 transition-all group">
      {/* Header */}
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
          <button
            onClick={() => onEdit(template)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(template.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 ml-1">
            {template.is_enabled ? (
              <ToggleRight className="w-5 h-5 text-green" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={`text-xs ${template.is_enabled ? 'text-green' : 'text-muted-foreground'}`}>
              {template.is_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      {template.description && (
        <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
      )}

      {/* Actions */}
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
                    <span key={cred} className="text-[10px] bg-green/10 text-green border border-green/20 rounded-full px-2 py-0.5">
                      {cred}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 text-[11px] text-muted-foreground">
        <span>Type: {template.base_entity_type}</span>
        {template.default_sprite && <span>Sprite: {template.default_sprite}</span>}
      </div>
    </div>
  );
};

export const ObjectTemplates: React.FC<ObjectTemplatesProps> = ({ onNavigate }) => {
  const { data: templates = [], isLoading } = useObjectTemplates(false);
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (t: ObjectTemplate) => {
    setEditingId(t.id);
    setForm({
      id: t.id,
      name: t.name,
      icon: t.icon || '📦',
      category: t.category,
      description: t.description || '',
      base_entity_type: t.base_entity_type,
      default_sprite: t.default_sprite || '',
      is_enabled: t.is_enabled ?? true,
      actions: JSON.stringify(t.actions || {}, null, 2),
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Delete template "${id}"?`)) return;
    await (supabase as any).from('object_templates').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['game-object-templates'] });
  };

  const handleSave = async () => {
    if (!form.id || !form.name) return;
    setSaving(true);
    let parsedActions: any = {};
    try { parsedActions = JSON.parse(form.actions); } catch { /* keep empty */ }

    const payload = {
      id: form.id,
      name: form.name,
      icon: form.icon,
      category: form.category,
      description: form.description || null,
      base_entity_type: form.base_entity_type,
      default_sprite: form.default_sprite || null,
      is_enabled: form.is_enabled,
      actions: parsedActions,
    };

    if (editingId) {
      const { id: _, ...updatePayload } = payload;
      await (supabase as any).from('object_templates').update(updatePayload).eq('id', editingId);
    } else {
      await (supabase as any).from('object_templates').insert(payload);
    }

    queryClient.invalidateQueries({ queryKey: ['game-object-templates'] });
    setSaving(false);
    setModalOpen(false);
  };

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen">
      {/* Page header */}
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Object Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Game objects available for placement on maps</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green/10 text-green border border-green/20 hover:bg-green/20 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      <div className="px-6 pb-6">
        {isLoading ? (
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
              <ObjectTemplateCard key={t.id} template={t} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Template' : 'Create Template'}
        size="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="ID"
              value={form.id}
              onChange={(v) => setField('id', v)}
              placeholder="e.g. mailbox"
              disabled={!!editingId}
            />
            <FormInput label="Name" value={form.name} onChange={(v) => setField('name', v)} placeholder="e.g. Mailbox" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Icon" value={form.icon} onChange={(v) => setField('icon', v)} placeholder="📦" />
            <FormInput label="Category" value={form.category} onChange={(v) => setField('category', v)} placeholder="object" />
            <FormInput label="Base Entity Type" value={form.base_entity_type} onChange={(v) => setField('base_entity_type', v)} placeholder="object" />
          </div>
          <FormInput label="Default Sprite" value={form.default_sprite} onChange={(v) => setField('default_sprite', v)} placeholder="(optional)" />
          <FormTextarea label="Description" value={form.description} onChange={(v) => setField('description', v)} placeholder="What does this object do?" rows={2} />
          <FormTextarea label="Actions (JSON)" value={form.actions} onChange={(v) => setField('actions', v)} rows={6} monospace />
          <FormToggle label="Enabled" checked={form.is_enabled} onChange={(v) => setField('is_enabled', v)} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
          <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.id || !form.name}
            className="px-5 py-2 rounded-xl bg-green text-dark text-sm font-medium hover:bg-green/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
