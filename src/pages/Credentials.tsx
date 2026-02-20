import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CredentialCard } from '@/components/credentials/CredentialCard';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Plus, Key, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui-custom/Modal';
import { useCredentials } from '@/hooks/useCredentials';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

const serviceOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'groq', label: 'Groq' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'cerebras', label: 'Cerebras' },
  { value: 'moonshot', label: 'Moonshot / Kimi' },
  { value: 'slack', label: 'Slack' },
  { value: 'github', label: 'GitHub' },
  { value: 'stripe', label: 'Stripe' },
];

interface CredentialsProps {
  onNavigate: (page: string) => void;
}

export const Credentials: React.FC<CredentialsProps> = ({ onNavigate }) => {
  const { credentials, isLoading, addCredential, updateCredential, deleteCredential, isAdding, isUpdating } = useCredentials();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formService, setFormService] = useState('');
  const [formApiKey, setFormApiKey] = useState('');

  const openAddModal = useCallback(() => {
    setEditingId(null);
    setFormName('');
    setFormService('');
    setFormApiKey('');
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((cred: { id: string; name: string; service: string }) => {
    setEditingId(cred.id);
    setFormName(cred.name);
    setFormService(cred.service);
    setFormApiKey('');
    setIsModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formName.trim() || !formService) {
      toast.error('Name and service are required');
      return;
    }
    try {
      if (editingId) {
        await updateCredential({ id: editingId, name: formName.trim(), service: formService, api_key: formApiKey || undefined });
      } else {
        if (!formApiKey) {
          toast.error('API key is required');
          return;
        }
        await addCredential({ name: formName.trim(), service: formService, api_key: formApiKey });
      }
      setIsModalOpen(false);
    } catch {
      // error toasts handled by hook
    }
  }, [editingId, formName, formService, formApiKey, addCredential, updateCredential]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Delete this credential? This cannot be undone.')) return;
    await deleteCredential(id);
  }, [deleteCredential]);

  const filteredCredentials = credentials.filter(cred =>
    cred.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.service.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isSaving = isAdding || isUpdating;

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Credentials</h1>
          <p className="text-white/50 mt-1">Manage your API keys and service connections</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" /> Add Credential
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search credentials..." className="max-w-md" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : filteredCredentials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCredentials.map((cred) => (
            <CredentialCard
              key={cred.id}
              id={cred.id}
              name={cred.name}
              type={cred.service}
              isConnected={cred.is_active}
              keyHint={cred.key_hint}
              lastUsed={cred.last_used_at ? formatRelativeTime(cred.last_used_at) : undefined}
              onEdit={() => openEditModal(cred)}
              onDelete={() => handleDelete(cred.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No credentials found" description="Add your first API key to connect with external services" icon={<Key className="w-8 h-8" />} actionLabel="Add Credential" onAction={openAddModal} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Credential' : 'Add Credential'} description={editingId ? 'Update your API key or service connection' : 'Add a new API key or service connection'}>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Name</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., OpenAI Production" className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">Service</label>
            <select value={formService} onChange={(e) => setFormService(e.target.value)} className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-green/50">
              <option value="">Select a service</option>
              {serviceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wider mb-2 block">API Key</label>
            <input type="password" value={formApiKey} onChange={(e) => setFormApiKey(e.target.value)} placeholder={editingId ? 'Leave blank to keep current' : 'Enter your API key'} className="w-full px-4 py-3 bg-dark-200 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green/50" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button className="bg-green text-dark hover:bg-green-light" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? 'Save' : 'Add Credential'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
