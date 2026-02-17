import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gameDb } from '@/lib/gameSchema';
import { MapEntityCard, EntityMiniMap } from '@/components/map-entities';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/dashboard/StatCard';
import { Layers, Bot, User, Map, Search, Hammer, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MapBrowserProps {
  onNavigate: (page: string) => void;
}

export const MapBrowser: React.FC<MapBrowserProps> = ({ onNavigate }) => {
  const [selectedMap, setSelectedMap] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // Fetch maps
  const { data: maps = [], isLoading: loadingMaps } = useQuery({
    queryKey: ['game-maps'],
    queryFn: async () => {
      const { data, error } = await gameDb().from('map_metadata').select('*');
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch entities
  const { data: entities = [], isLoading: loadingEntities } = useQuery({
    queryKey: ['game-map-entities'],
    queryFn: async () => {
      const { data, error } = await gameDb().from('map_entities').select('*').order('display_name', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    let result = entities;
    if (selectedMap !== 'all') {
      result = result.filter((e: any) => e.map_id === selectedMap);
    }
    if (sourceFilter !== 'all') {
      result = result.filter((e: any) => e.source === sourceFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e: any) =>
        e.display_name?.toLowerCase().includes(q) ||
        e.entity_type?.toLowerCase().includes(q) ||
        e.tiled_class?.toLowerCase().includes(q) ||
        e.template_id?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [entities, selectedMap, search, sourceFilter]);

  const totalEntities = filtered.length;
  const aiNpcs = filtered.filter((e: any) => e.entity_type === 'ai-npc' || e.ai_enabled).length;
  const regularNpcs = totalEntities - aiNpcs;

  // Derive unique map ids from entities if map_metadata is empty
  const mapOptions = useMemo(() => {
    const fromMeta = maps.map((m: any) => m.map_id);
    const fromEntities = [...new Set(entities.map((e: any) => e.map_id))];
    return [...new Set([...fromMeta, ...fromEntities])].sort();
  }, [maps, entities]);

  // Derive unique sources
  const sourceOptions = useMemo(() => {
    const sources = [...new Set(entities.map((e: any) => e.source).filter(Boolean))];
    return sources.sort();
  }, [entities]);

  const isLoading = loadingMaps || loadingEntities;

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
          <Layers className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Map Browser</h1>
          <p className="text-sm text-white/50">Browse entities synced from Tiled maps</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Entities" value={String(totalEntities)} subtitle="On selected map(s)" icon={<Layers className="w-5 h-5" />} />
        <StatCard title="AI NPCs" value={String(aiNpcs)} subtitle="With agent config" icon={<Bot className="w-5 h-5" />} />
        <StatCard title="Regular NPCs" value={String(regularNpcs)} subtitle="No AI config" icon={<User className="w-5 h-5" />} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Map selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedMap('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedMap === 'all'
                ? 'bg-green/15 border-green/30 text-green'
                : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
            }`}
          >
            All Maps
          </button>
          {mapOptions.map((mapId) => (
            <button
              key={mapId}
              onClick={() => setSelectedMap(mapId)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedMap === mapId
                  ? 'bg-green/15 border-green/30 text-green'
                  : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              <Map className="w-3 h-3" />
              {mapId}
            </button>
          ))}
        </div>

        {/* Source filter */}
        {sourceOptions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Source:</span>
            <button
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                sourceFilter === 'all'
                  ? 'bg-accent/15 border-accent/30 text-accent-foreground'
                  : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              All
            </button>
            {sourceOptions.map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  sourceFilter === src
                    ? 'bg-accent/15 border-accent/30 text-accent-foreground'
                    : 'border-white/10 text-white/50 hover:text-white hover:border-white/20'
                }`}
              >
                {src === 'builder' ? <Hammer className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                {src}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entities..."
            className="pl-9 bg-dark-100 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Mini-maps per map */}
      {!isLoading && mapOptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(selectedMap === 'all' ? mapOptions : [selectedMap]).map((mapId) => {
            const mapEntities = entities.filter((e: any) => e.map_id === mapId);
            return (
              <EntityMiniMap
                key={mapId}
                mapId={mapId}
                entities={mapEntities}
              />
            );
          })}
        </div>
      )}

      {/* Entity grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/50">No entities found</p>
          <p className="text-xs text-white/30 mt-1">
            {search ? 'Try a different search term' : 'Run the Tiled sync pipeline to populate map entities'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entity: any) => (
            <MapEntityCard
              key={entity.id}
              id={entity.id}
              displayName={entity.display_name}
              entityType={entity.entity_type}
              positionX={entity.position_x}
              positionY={entity.position_y}
              sprite={entity.sprite}
              tiledClass={entity.tiled_class}
              aiEnabled={entity.ai_enabled}
              agentConfigId={entity.agent_config_id}
              source={entity.source}
              templateId={entity.template_id}
              behaviorConfig={entity.behavior_config}
              metadata={entity.metadata}
              onViewNpc={() => onNavigate('npcs')}
            />
          ))}
        </div>
      )}
    </div>
  );
};
