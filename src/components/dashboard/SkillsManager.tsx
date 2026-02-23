import React, { useState } from 'react';
import { usePicoClawSkills, useCreateSkill, useUpdateSkill, useDeleteSkill, useSkillAgentCounts, PicoClawSkill } from '@/hooks/usePicoClawAgents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, Wrench, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['core', 'analysis', 'creative', 'developer', 'research'] as const;

const categoryColors: Record<string, string> = {
  core: 'bg-accent-green/20 text-accent-green',
  analysis: 'bg-blue-500/20 text-blue-400',
  creative: 'bg-purple-500/20 text-purple-400',
  developer: 'bg-amber-500/20 text-amber-400',
  research: 'bg-cyan-500/20 text-cyan-400',
};

interface SkillFormState {
  name: string;
  slug: string;
  description: string;
  category: string;
  skill_md: string;
  tools: string;
  is_builtin: boolean;
}

const emptyForm: SkillFormState = { name: '', slug: '', description: '', category: 'core', skill_md: '', tools: '', is_builtin: false };

export const SkillsManager: React.FC = () => {
  const { data: skills = [], isLoading } = usePicoClawSkills();
  const { data: agentCounts = {} } = useSkillAgentCounts();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const deleteSkill = useDeleteSkill();

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SkillFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<PicoClawSkill | null>(null);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setFormOpen(true); };
  const openEdit = (s: PicoClawSkill) => {
    setEditingId(s.id);
    setForm({
      name: s.name, slug: s.slug, description: s.description,
      category: s.category, skill_md: s.skill_md,
      tools: Array.isArray(s.tools) ? (s.tools as string[]).join(', ') : '',
      is_builtin: s.is_builtin,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const toolsArray = form.tools.split(',').map(t => t.trim()).filter(Boolean);
    const payload = { name: form.name, slug: form.slug, description: form.description, category: form.category, skill_md: form.skill_md, tools: toolsArray, is_builtin: form.is_builtin };
    if (editingId) {
      await updateSkill.mutateAsync({ id: editingId, ...payload });
    } else {
      await createSkill.mutateAsync(payload);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteSkill.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">PicoClaw Skills</h2>
          <p className="text-sm text-muted-foreground">{skills.length} skills registered</p>
        </div>
        <Button onClick={openCreate} className="bg-accent-green text-background hover:bg-accent-green/90">
          <Plus className="w-4 h-4 mr-2" /> Create Skill
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {skills.map(skill => (
          <div key={skill.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-accent-green/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground truncate">{skill.name}</h3>
                  {skill.is_builtin && (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green">
                      <Shield className="w-3 h-3" /> Built-in
                    </span>
                  )}
                </div>
                <code className="text-xs text-muted-foreground">{skill.slug}</code>
              </div>
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider', categoryColors[skill.category] || 'bg-muted text-muted-foreground')}>
                {skill.category}
              </span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{skill.description || 'No description'}</p>

            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(skill.tools) ? skill.tools as string[] : []).map((tool, i) => (
                <span key={i} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                  <Wrench className="w-3 h-3" /> {tool}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" /> {agentCounts[skill.id] || 0} agents
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(skill)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(skill)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Skill' : 'Create Skill'}</DialogTitle>
            <DialogDescription>Fill in the skill details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Memory Recall" /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="memory-recall" /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Skill Markdown</Label><Textarea rows={4} value={form.skill_md} onChange={e => setForm(f => ({ ...f, skill_md: e.target.value }))} placeholder="Instructions for the LLM..." /></div>
            <div><Label>Tools (comma-separated)</Label><Input value={form.tools} onChange={e => setForm(f => ({ ...f, tools: e.target.value }))} placeholder="recall_memory, store_memory" /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_builtin} onCheckedChange={v => setForm(f => ({ ...f, is_builtin: v }))} />
              <Label>Built-in skill</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.slug} className="bg-accent-green text-background hover:bg-accent-green/90">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle>Delete Skill</DialogTitle>
            <DialogDescription>
              {deleteTarget && (agentCounts[deleteTarget.id] || 0) > 0
                ? `This skill is assigned to ${agentCounts[deleteTarget.id]} agent(s). Deleting it will remove those assignments.`
                : `Are you sure you want to delete "${deleteTarget?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
