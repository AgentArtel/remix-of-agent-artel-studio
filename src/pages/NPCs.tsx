import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { broadcastNPCCreated, broadcastNPCUpdated, broadcastNPCDeleted } from '@/lib/gameBroadcast';
import { NPCCard } from '@/components/npcs/NPCCard';
import { NPCFormModal } from '@/components/npcs/NPCFormModal';
import { SearchBar } from '@/components/workflow/SearchBar';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type AgentConfig = Tables<'agent_configs'>;

interface NpcBuilderProps {
  onNavigate: (page: string) => void;
}

export const NpcBuilder: React.FC<NpcBuilderProps> = ({ onNavigate }) => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNpc, setEditingNpc] = useState<AgentConfig | null>(null);

  const { data: npcs = [], isLoading } = useQuery({
    queryKey: ['game-agent-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('*')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (npc: Partial<AgentConfig> & { id: string; name: string; prompt: string }) => {
      const { data, error } = await supabase
        .from('agent_configs')
        .insert(npc)
        .select()
        .single();
      if (error) throw error;
      await broadcastNPCCreated(data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
      toast.success('NPC created and live in game!');
      setIsModalOpen(false);
    },
    onError: (err: Error) => toast.error(`Failed to create NPC: ${err.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: async (npc: AgentConfig) => {
      const { id, created_at, updated_at, ...rest } = npc;
      const { data, error } = await supabase
        .from('agent_configs')
        .update(rest)
        .eq('id', npc.id)
        .select()
        .single();
      if (error) throw error;
      await broadcastNPCUpdated(data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
      toast.success('NPC updated in game!');
      setIsModalOpen(false);
      setEditingNpc(null);
    },
    onError: (err: Error) => toast.error(`Failed to update NPC: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_configs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await broadcastNPCDeleted(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
      toast.success('NPC removed from game');
    },
    onError: (err: Error) => toast.error(`Failed to delete NPC: ${err.message}`),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('agent_configs')
        .update({ is_enabled })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-agent-configs'] });
    },
    onError: (err: Error) => toast.error(`Failed to toggle NPC: ${err.message}`),
  });

  const openCreate = useCallback(() => {
    setEditingNpc(null);
    setIsModalOpen(true);
  }, []);

  const openEdit = useCallback((npc: AgentConfig) => {
    setEditingNpc(npc);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (!window.confirm('Delete this NPC? This cannot be undone.')) return;
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleSave = useCallback(
    (data: any) => {
      if (editingNpc) {
        updateMutation.mutate({ ...editingNpc, ...data });
      } else {
        createMutation.mutate(data);
      }
    },
    [editingNpc, createMutation, updateMutation],
  );

  const filtered = npcs.filter(
    (npc) => npc.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getSprite = (npc: AgentConfig) => {
    const appearance = npc.appearance as any;
    return appearance?.sprite || npc.default_sprite || 'female';
  };

  const getSpawnMap = (npc: AgentConfig) => {
    const spawn = npc.spawn_config as any;
    return spawn?.mapId || 'no map';
  };

  const getSkillsList = (npc: AgentConfig) => {
    const skills = npc.skills as any;
    return Array.isArray(skills) ? skills : [];
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">NPCs</h1>
          <p className="text-white/50 mt-1">Manage AI characters in the game world</p>
        </div>
        <Button className="bg-green text-dark hover:bg-green-light" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Create NPC
        </Button>
      </div>

      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search NPCs..."
          className="max-w-md"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((npc) => (
            <NPCCard
              key={npc.id}
              id={npc.id}
              name={npc.name}
              icon={npc.icon || '🤖'}
              sprite={getSprite(npc)}
              enabled={npc.is_enabled ?? true}
              spawnMap={getSpawnMap(npc)}
              skills={getSkillsList(npc)}
              onEdit={() => openEdit(npc)}
              onDelete={() => handleDelete(npc.id)}
              onToggle={() => toggleMutation.mutate({ id: npc.id, is_enabled: !(npc.is_enabled ?? true) })}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No NPCs found"
          description="Create your first AI NPC to populate the game world"
          icon={<Users className="w-8 h-8" />}
          actionLabel="Create NPC"
          onAction={openCreate}
        />
      )}

      <NPCFormModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingNpc(null); }}
        onSave={handleSave}
        initialData={editingNpc}
      />
    </div>
  );
};
