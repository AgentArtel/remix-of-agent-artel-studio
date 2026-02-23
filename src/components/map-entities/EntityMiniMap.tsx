import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Entity {
  id: string;
  display_name: string;
  entity_type: string;
  position_x: number;
  position_y: number;
  ai_enabled?: boolean;
}

interface EntityMiniMapProps {
  entities: Entity[];
  mapId: string;
  className?: string;
}

export const EntityMiniMap: React.FC<EntityMiniMapProps> = ({ entities, mapId, className = '' }) => {
  const MAP_W = 280;
  const MAP_H = 200;
  const PAD = 24;

  const { scale, offsetX, offsetY } = useMemo(() => {
    if (entities.length === 0) return { scale: 1, offsetX: PAD, offsetY: PAD };

    const minX = Math.min(...entities.map(e => e.position_x));
    const maxX = Math.max(...entities.map(e => e.position_x));
    const minY = Math.min(...entities.map(e => e.position_y));
    const maxY = Math.max(...entities.map(e => e.position_y));

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const usableW = MAP_W - PAD * 2;
    const usableH = MAP_H - PAD * 2;

    const s = Math.min(usableW / rangeX, usableH / rangeY);

    return {
      scale: s,
      offsetX: PAD + (usableW - rangeX * s) / 2 - minX * s,
      offsetY: PAD + (usableH - rangeY * s) / 2 - minY * s,
    };
  }, [entities]);

  return (
    <div className={`rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-xs font-semibold text-foreground tracking-wide uppercase">{mapId}</span>
        <span className="text-[10px] text-muted-foreground">{entities.length} entities</span>
      </div>

      {/* Map canvas */}
      <TooltipProvider delayDuration={100}>
        <svg
          width={MAP_W}
          height={MAP_H}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          className="w-full"
          style={{ aspectRatio: `${MAP_W}/${MAP_H}` }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id={`grid-${mapId}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill={`url(#grid-${mapId})`} />

          {/* Entity dots */}
          {entities.map(entity => {
            const cx = entity.position_x * scale + offsetX;
            const cy = entity.position_y * scale + offsetY;
            const isAI = entity.ai_enabled || entity.entity_type === 'ai-npc';

            return (
              <Tooltip key={entity.id}>
                <TooltipTrigger asChild>
                  <g className="cursor-pointer">
                    {/* Glow ring for AI */}
                    {isAI && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={8}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="1"
                        opacity="0.3"
                        className="animate-pulse"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isAI ? 5 : 4}
                      fill={isAI ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))'}
                      stroke={isAI ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                      strokeWidth="1.5"
                      opacity={isAI ? 1 : 0.7}
                    />
                  </g>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{entity.display_name}</p>
                  <p className="text-muted-foreground">({entity.position_x}, {entity.position_y})</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </svg>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[10px] text-muted-foreground">AI NPC</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/70" />
          <span className="text-[10px] text-muted-foreground">Other</span>
        </div>
      </div>
    </div>
  );
};
