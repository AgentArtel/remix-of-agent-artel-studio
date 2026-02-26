import React from 'react';
import { FileText, Image, StickyNote, Lightbulb, Trash2, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorldLoreEntry } from '@/hooks/useWorldLore';
import type { Fragment } from '@/hooks/useFragments';
import { cn } from '@/lib/utils';

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  document: { icon: FileText, label: 'Doc', color: 'bg-blue-500/15 text-blue-400' },
  image: { icon: Image, label: 'Image', color: 'bg-purple-500/15 text-purple-400' },
  note: { icon: StickyNote, label: 'Note', color: 'bg-amber-500/15 text-amber-400' },
  concept: { icon: Lightbulb, label: 'Concept', color: 'bg-green/15 text-green' },
};

function computeProgress(entry: WorldLoreEntry, chunkCount?: number, fragment?: Fragment | null): number {
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const fragDone = fragment ? fragment.total_chunks > 0 && fragment.revealed_chunks >= fragment.total_chunks : false;
  let p = 0;
  if (entry.storage_path) p += 15;
  if (entry.content) p += 25;
  if (entry.summary) p += 15;
  if (tags.length > 0) p += 10;
  if ((chunkCount ?? 0) > 0) p += 15;
  if (fragment) p += 10;
  if (fragDone) p += 10;
  return p;
}

interface Props {
  entry: WorldLoreEntry;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  chunkCount?: number;
  fragment?: Fragment | null;
}

export const LoreEntryCard: React.FC<Props> = ({ entry, isSelected, onClick, onDelete, chunkCount, fragment }) => {
  const config = typeConfig[entry.entry_type] ?? typeConfig.document;
  const Icon = config.icon;
  const progress = computeProgress(entry, chunkCount, fragment);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all',
        isSelected
          ? 'border-green/40 bg-green/5'
          : 'border-white/5 hover:border-white/10 bg-dark-200',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', config.color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{entry.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', config.color)}>
              {config.label}
            </span>
            {chunkCount != null && chunkCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green/10 text-green">
                <Database className="w-2.5 h-2.5" />
                {chunkCount} chunks
              </span>
            )}
          </div>
          {entry.storage_path && !entry.content && (
            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/70 mt-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Processing...
            </span>
          )}
          {entry.summary && (
            <p className="text-xs text-white/30 mt-1 line-clamp-2">{entry.summary}</p>
          )}
          {!entry.summary && entry.content && (
            <p className="text-xs text-white/30 mt-1 line-clamp-2">{entry.content}</p>
          )}
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-white/30 hover:text-destructive shrink-0"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              progress === 100 ? 'bg-green' : progress >= 50 ? 'bg-amber-400' : 'bg-white/20'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-white/30 tabular-nums w-7 text-right">{progress}%</span>
      </div>
    </div>
  );
};
