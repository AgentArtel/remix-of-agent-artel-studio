import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  MessageSquare,
  Globe,
  BookOpen,
  Package,
  ScrollText,
  Plus,
  Gamepad2,
  ArrowRight,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatRelativeTime';

interface GameDashboardProps {
  onNavigate: (page: string) => void;
}

export const GameDashboard: React.FC<GameDashboardProps> = ({ onNavigate }) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['game-dashboard-stats'],
    queryFn: async () => {
      const [npcRes, msgRes, playerRes, loreRes, fragRes, objRes] = await Promise.all([
        supabase.from('agent_configs').select('id', { count: 'exact', head: true }).eq('is_enabled', true),
        supabase.from('agent_memory').select('id', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('player_state').select('player_id', { count: 'exact', head: true }),
        supabase.from('world_lore_entries').select('id', { count: 'exact', head: true }),
        supabase.from('fragment_archive').select('id', { count: 'exact', head: true }),
        supabase.from('object_templates').select('id', { count: 'exact', head: true }),
      ]);
      return {
        activeNpcs: npcRes.count ?? 0,
        playerMessages: msgRes.count ?? 0,
        onlinePlayers: playerRes.count ?? 0,
        loreEntries: loreRes.count ?? 0,
        fragments: fragRes.count ?? 0,
        objectTemplates: objRes.count ?? 0,
      };
    },
  });

  const { data: recentNpcs = [] } = useQuery({
    queryKey: ['game-recent-npcs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_configs')
        .select('id, name, icon, category, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentLore = [] } = useQuery({
    queryKey: ['game-recent-lore'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('world_lore_entries')
        .select('id, title, entry_type, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: recentFragments = [] } = useQuery({
    queryKey: ['game-recent-fragments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fragment_archive')
        .select('id, title, fragment_type, certainty_level, revealed_chunks, total_chunks, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const certaintyColors: Record<string, string> = {
    sealed: 'bg-white/10 text-white/50',
    speculative: 'bg-amber-500/20 text-amber-400',
    partial: 'bg-blue-500/20 text-blue-400',
    confirmed: 'bg-green/20 text-green',
  };

  const quickLinks = [
    { label: 'NPCs', icon: Users, page: 'npcs', count: stats?.activeNpcs },
    { label: 'World Lore', icon: BookOpen, page: 'world-lore', count: stats?.loreEntries },
    { label: 'Objects', icon: Package, page: 'object-templates', count: stats?.objectTemplates },
    { label: 'Map Browser', icon: Globe, page: 'map-browser', count: null },
  ];

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Game Design</h1>
          <p className="text-white/50 mt-1">Your game world at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/5" onClick={() => onNavigate('play-game')}>
            <Gamepad2 className="w-4 h-4 mr-2" /> Play Game
          </Button>
          <Button className="bg-green text-dark hover:bg-green-light" onClick={() => onNavigate('npcs')}>
            <Plus className="w-4 h-4 mr-2" /> Create NPC
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard title="Active NPCs" value={String(stats?.activeNpcs ?? 0)} subtitle="Enabled characters" icon={<Users className="w-5 h-5" />} />
            <StatCard title="Lore Entries" value={String(stats?.loreEntries ?? 0)} subtitle="World documents" icon={<BookOpen className="w-5 h-5" />} />
            <StatCard title="Fragments" value={String(stats?.fragments ?? 0)} subtitle="Sealed knowledge" icon={<ScrollText className="w-5 h-5" />} />
            <StatCard title="Objects" value={String(stats?.objectTemplates ?? 0)} subtitle="Item templates" icon={<Package className="w-5 h-5" />} />
            <StatCard title="Messages" value={String(stats?.playerMessages ?? 0)} subtitle="Player conversations" icon={<MessageSquare className="w-5 h-5" />} />
            <StatCard title="Players" value={String(stats?.onlinePlayers ?? 0)} subtitle="Currently online" icon={<Globe className="w-5 h-5" />} />
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickLinks.map((link) => (
          <button
            key={link.page}
            onClick={() => onNavigate(link.page)}
            className="flex items-center gap-3 p-4 rounded-xl bg-dark-100 border border-white/5 hover:border-green/30 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center group-hover:bg-green/20 transition-colors">
              <link.icon className="w-5 h-5 text-green" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white">{link.label}</p>
              {link.count != null && <p className="text-xs text-white/40">{link.count} items</p>}
            </div>
            <ArrowRight className="w-4 h-4 text-white/20 ml-auto group-hover:text-green transition-colors" />
          </button>
        ))}
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent NPCs */}
        <div className="bg-dark-100 rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Recent NPCs</h2>
            <Button variant="ghost" size="sm" className="text-green hover:text-green-light" onClick={() => onNavigate('npcs')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentNpcs.length === 0 ? (
              <p className="text-white/30 text-sm">No NPCs yet. Create your first character!</p>
            ) : (
              recentNpcs.map((npc) => (
                <div key={npc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <span className="text-xl">{npc.icon || '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{npc.name}</p>
                    <p className="text-xs text-white/40">{npc.category} · {formatRelativeTime(npc.updated_at)}</p>
                  </div>
                </div>
              ))
            )}
        </div>

        {/* Recent Fragments */}
        <div className="bg-dark-100 rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Recent Fragments</h2>
            <Button variant="ghost" size="sm" className="text-green hover:text-green-light" onClick={() => onNavigate('world-lore')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentFragments.length === 0 ? (
              <p className="text-white/30 text-sm">No fragments yet. Seal lore to create fragments!</p>
            ) : (
              recentFragments.map((frag) => (
                <div key={frag.id} onClick={() => onNavigate('world-lore:fragments')} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <ScrollText className="w-4 h-4 text-green/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{frag.title}</p>
                    <p className="text-xs text-white/40">{frag.fragment_type} · {frag.revealed_chunks}/{frag.total_chunks} chunks · {formatRelativeTime(frag.updated_at)}</p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${certaintyColors[frag.certainty_level] ?? 'bg-white/10 text-white/50'}`}>
                    {frag.certainty_level}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

        {/* Recent Lore */}
        <div className="bg-dark-100 rounded-xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Recent Lore</h2>
            <Button variant="ghost" size="sm" className="text-green hover:text-green-light" onClick={() => onNavigate('world-lore')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentLore.length === 0 ? (
              <p className="text-white/30 text-sm">No lore entries yet. Upload your first document!</p>
            ) : (
              recentLore.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <BookOpen className="w-4 h-4 text-green/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.title}</p>
                    <p className="text-xs text-white/40">{entry.entry_type} · {formatRelativeTime(entry.updated_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
