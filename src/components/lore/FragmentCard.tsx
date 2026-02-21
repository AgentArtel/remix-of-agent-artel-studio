import React from 'react';
import { FileText, Image, Music, StickyNote, Sparkles, Lock, Eye, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui-custom/ProgressBar';
import type { Fragment } from '@/hooks/useFragments';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, React.ElementType> = {
  document: FileText,
  image: Image,
  audio: Music,
  note: StickyNote,
  text: FileText,
};

const certaintyConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sealed: { label: 'Sealed', color: 'bg-white/10 text-white/40', icon: Lock },
  speculative: { label: 'Speculative', color: 'bg-amber-500/15 text-amber-400', icon: Eye },
  partial: { label: 'Partial', color: 'bg-blue-500/15 text-blue-400', icon: Eye },
  confirmed: { label: 'Confirmed', color: 'bg-green/15 text-green', icon: CheckCircle },
};

interface Props {
  fragment: Fragment;
  onDecipher: (fragmentId: string) => void;
  isDeciphering?: boolean;
}

export const FragmentCard: React.FC<Props> = ({ fragment, onDecipher, isDeciphering }) => {
  const Icon = typeIcons[fragment.fragment_type] ?? FileText;
  const certainty = certaintyConfig[fragment.certainty_level] ?? certaintyConfig.sealed;
  const CertaintyIcon = certainty.icon;
  const progress = fragment.total_chunks > 0
    ? Math.round((fragment.revealed_chunks / fragment.total_chunks) * 100)
    : 0;
  const isFullyRevealed = fragment.revealed_chunks >= fragment.total_chunks && fragment.total_chunks > 0;

  return (
    <div className="group flex flex-col gap-2.5 p-3 rounded-xl border border-white/5 bg-dark-200 hover:border-white/10 transition-all">
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white/50" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{fragment.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium', certainty.color)}>
              <CertaintyIcon className="w-2.5 h-2.5" />
              {certainty.label}
            </span>
            {fragment.total_chunks > 0 && (
              <span className="text-[10px] text-white/30">
                {fragment.revealed_chunks}/{fragment.total_chunks} chunks
              </span>
            )}
          </div>
        </div>

        {/* Decipher button */}
        {!isFullyRevealed && fragment.total_chunks > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'shrink-0 text-xs gap-1.5 h-8',
              isDeciphering
                ? 'text-amber-400'
                : 'text-green hover:text-green-light hover:bg-green/10'
            )}
            onClick={() => onDecipher(fragment.id)}
            disabled={isDeciphering}
          >
            {isDeciphering ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deciphering...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Decipher</>
            )}
          </Button>
        )}
        {isFullyRevealed && (
          <span className="text-[10px] text-green/60 px-2 py-1">✓ Complete</span>
        )}
      </div>

      {/* Progress bar */}
      {fragment.total_chunks > 0 && (
        <ProgressBar
          value={fragment.revealed_chunks}
          max={fragment.total_chunks}
          size="sm"
          variant={isFullyRevealed ? 'success' : 'default'}
        />
      )}

      {fragment.total_chunks === 0 && (
        <p className="text-[10px] text-white/20 italic">Awaiting text extraction...</p>
      )}
    </div>
  );
};
