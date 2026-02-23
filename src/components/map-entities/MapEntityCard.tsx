import React from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Bot, User, ExternalLink, Hammer, Map as MapIcon } from 'lucide-react';
import { Chip } from '@/components/ui-custom/Chip';

interface MapEntityCardProps {
  id: string;
  displayName: string;
  entityType: string;
  positionX: number;
  positionY: number;
  sprite: string | null;
  tiledClass: string | null;
  aiEnabled: boolean;
  agentConfigId: string | null;
  source: string | null;
  templateId: string | null;
  behaviorConfig: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  onViewNpc?: () => void;
}

export const MapEntityCard: React.FC<MapEntityCardProps> = ({
  displayName,
  entityType,
  positionX,
  positionY,
  sprite,
  tiledClass,
  aiEnabled,
  agentConfigId,
  source,
  templateId,
  behaviorConfig,
  metadata,
  onViewNpc,
}) => {
  const isAi = entityType === 'ai-npc' || aiEnabled;
  const isBuilder = source === 'builder';

  return (
    <div
      className={cn(
        'group relative p-5 rounded-2xl bg-dark-100 border transition-all duration-fast',
        isAi
          ? 'border-green/30 hover:border-green/50 hover:shadow-glow'
          : 'border-white/5 hover:border-white/10',
      )}
    >
      {/* Source badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isAi && (
          <div className="w-2.5 h-2.5 rounded-full bg-green">
            <div className="absolute inset-0 rounded-full bg-green animate-ping opacity-30" />
          </div>
        )}
        {source && (
          <span className={cn(
            'px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider',
            isBuilder
              ? 'bg-accent/15 text-accent-foreground border border-accent/30'
              : 'bg-white/5 text-white/40 border border-white/10',
          )}>
            {isBuilder ? <Hammer className="w-3 h-3 inline mr-1 -mt-0.5" /> : <MapIcon className="w-3 h-3 inline mr-1 -mt-0.5" />}
            {source}
          </span>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center text-lg',
          isAi ? 'bg-green/10 text-green' : 'bg-dark-200 text-white/40',
        )}>
          {isAi ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{displayName}</h3>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Chip variant={isAi ? 'green' : 'gray'} size="sm">
              {entityType}
            </Chip>
            {tiledClass && (
              <Chip variant="blue" size="sm">
                {tiledClass}
              </Chip>
            )}
            {templateId && (
              <Chip variant="yellow" size="sm">
                ⚡ {templateId}
              </Chip>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <MapPin className="w-3.5 h-3.5 text-white/40" />
            <span className="text-xs text-white/40">({positionX}, {positionY})</span>
          </div>

          {sprite && (
            <p className="text-[10px] text-white/30 mt-1 italic truncate">
              sprite: {sprite}
            </p>
          )}

          {/* Behavior config summary */}
          {behaviorConfig && Object.keys(behaviorConfig).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(behaviorConfig).slice(0, 3).map(([key, val]) => (
                <span key={key} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-white/30">
                  {key}: {typeof val === 'boolean' ? (val ? '✓' : '✗') : String(val).slice(0, 12)}
                </span>
              ))}
              {Object.keys(behaviorConfig).length > 3 && (
                <span className="text-[10px] text-white/20">+{Object.keys(behaviorConfig).length - 3}</span>
              )}
            </div>
          )}

          {/* Metadata personality preview */}
          {metadata?.personality && (
            <p className="text-[10px] text-white/25 mt-1 truncate italic">
              "{String(metadata.personality).slice(0, 60)}…"
            </p>
          )}
        </div>
      </div>

      {/* NPC config link */}
      {agentConfigId && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <button
            onClick={onViewNpc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-green hover:text-green-light hover:bg-green/5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View NPC Config
          </button>
        </div>
      )}
    </div>
  );
};
