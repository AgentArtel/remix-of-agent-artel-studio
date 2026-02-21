import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui-custom/ProgressBar';
import { parseLoreMediaMeta, inferMediaType } from '@/types/loreMedia';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Image,
  Music,
  Video,
  StickyNote,
  CheckCircle2,
  Circle,
  ExternalLink,
} from 'lucide-react';
import type { WorldLoreEntry } from '@/hooks/useWorldLore';

interface LoreEntryDetailProps {
  entryId: string;
  onNavigate: (page: string) => void;
}

interface ProgressStep {
  label: string;
  done: boolean;
  weight: number;
}

const typeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="w-5 h-5" />,
  image: <Image className="w-5 h-5" />,
  audio: <Music className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  note: <StickyNote className="w-5 h-5" />,
};

export const LoreEntryDetail: React.FC<LoreEntryDetailProps> = ({ entryId, onNavigate }) => {
  // Fetch entry
  const { data: entry, isLoading } = useQuery({
    queryKey: ['world-lore-entry', entryId],
    queryFn: async (): Promise<WorldLoreEntry | null> => {
      const { data, error } = await supabase
        .from('world_lore_entries')
        .select('*')
        .eq('id', entryId)
        .single();
      if (error) return null;
      return data as unknown as WorldLoreEntry;
    },
  });

  // Fetch chunk count
  const { data: chunkCount = 0 } = useQuery({
    queryKey: ['lore-entry-chunks', entryId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lore_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('entry_id', entryId);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Fetch linked fragment
  const { data: fragment } = useQuery({
    queryKey: ['lore-entry-fragment', entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fragment_archive')
        .select('id, title, certainty_level, revealed_chunks, total_chunks')
        .eq('lore_entry_id', entryId)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark text-white p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-dark text-white p-6">
        <Button variant="ghost" onClick={() => onNavigate('game-dashboard')} className="text-white/70 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <p className="text-white/50">Entry not found.</p>
      </div>
    );
  }

  const meta = parseLoreMediaMeta(entry.metadata);
  const inferredType = meta?.media_type ?? inferMediaType(entry.file_type) ?? 'document';
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const fragFullyDeciphered = fragment ? fragment.total_chunks > 0 && fragment.revealed_chunks >= fragment.total_chunks : false;

  const steps: ProgressStep[] = [
    { label: 'File uploaded', done: !!entry.storage_path, weight: 15 },
    { label: 'Content extracted', done: !!entry.content, weight: 25 },
    { label: 'Summary generated', done: !!entry.summary, weight: 15 },
    { label: 'Tags assigned', done: tags.length > 0, weight: 10 },
    { label: 'Chunks indexed', done: chunkCount > 0, weight: 15 },
    { label: 'Fragment created', done: !!fragment, weight: 10 },
    { label: 'Fully deciphered', done: fragFullyDeciphered, weight: 10 },
  ];

  const progress = steps.reduce((acc, s) => acc + (s.done ? s.weight : 0), 0);

  const certaintyColors: Record<string, string> = {
    sealed: 'bg-white/10 text-white/50',
    speculative: 'bg-amber-500/20 text-amber-400',
    partial: 'bg-blue-500/20 text-blue-400',
    confirmed: 'bg-green/20 text-green',
  };

  return (
    <div className="min-h-screen bg-dark text-white p-6">
      {/* Back button */}
      <Button variant="ghost" onClick={() => onNavigate('game-dashboard')} className="text-white/70 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-dark-100 rounded-xl border border-white/5 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center text-green">
              {typeIcons[inferredType] ?? <BookOpen className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-white truncate">{entry.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                <span className="capitalize">{entry.entry_type}</span>
                {entry.file_name && <span>· {entry.file_name}</span>}
                <span>· {formatRelativeTime(entry.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-dark-100 rounded-xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Deciphering Progress</h2>
            <span className="text-sm font-medium text-green">{progress}%</span>
          </div>
          <ProgressBar value={progress} size="md" variant={progress === 100 ? 'success' : 'default'} className="mb-5" />
          <div className="space-y-2">
            {steps.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-white/20 shrink-0" />
                )}
                <span className={`text-sm ${step.done ? 'text-white' : 'text-white/40'}`}>{step.label}</span>
                <span className="text-xs text-white/20 ml-auto">{step.weight}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Media metadata */}
        {meta && (
          <div className="bg-dark-100 rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-medium text-white mb-4">Media Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {meta.media_type === 'document' && (
                <>
                  {meta.page_count != null && <MetaField label="Pages" value={String(meta.page_count)} />}
                  {meta.word_count != null && <MetaField label="Words" value={meta.word_count.toLocaleString()} />}
                  {meta.language && <MetaField label="Language" value={meta.language} />}
                </>
              )}
              {meta.media_type === 'image' && (
                <>
                  {meta.width != null && meta.height != null && <MetaField label="Dimensions" value={`${meta.width}×${meta.height}`} />}
                  {meta.scene_description && <MetaField label="Scene" value={meta.scene_description} />}
                </>
              )}
              {(meta.media_type === 'audio' || meta.media_type === 'video') && (
                <>
                  {meta.duration_seconds != null && <MetaField label="Duration" value={`${Math.round(meta.duration_seconds)}s`} />}
                  {meta.transcript_status && <MetaField label="Transcript" value={meta.transcript_status} />}
                </>
              )}
              {meta.media_type === 'note' && (
                <>
                  {meta.source && <MetaField label="Source" value={meta.source} />}
                  {meta.category && <MetaField label="Category" value={meta.category} />}
                </>
              )}
            </div>
          </div>
        )}

        {/* Linked fragment */}
        {fragment && (
          <div className="bg-dark-100 rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-medium text-white mb-3">Linked Fragment</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{fragment.title}</p>
                <p className="text-xs text-white/40 mt-1">
                  {fragment.revealed_chunks}/{fragment.total_chunks} chunks revealed
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${certaintyColors[fragment.certainty_level] ?? 'bg-white/10 text-white/50'}`}>
                {fragment.certainty_level}
              </span>
            </div>
          </div>
        )}

        {/* Content preview */}
        {(entry.summary || entry.content) && (
          <div className="bg-dark-100 rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-medium text-white mb-3">
              {entry.summary ? 'Summary' : 'Content Preview'}
            </h2>
            <p className="text-sm text-white/60 whitespace-pre-wrap line-clamp-6">
              {entry.summary || entry.content}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            onClick={() => onNavigate('world-lore:chat')}
          >
            <ExternalLink className="w-4 h-4 mr-2" /> Open in Lore Workshop
          </Button>
          {fragment && (
            <Button
              variant="outline"
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              onClick={() => onNavigate('world-lore:fragments')}
            >
              View Fragment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const MetaField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-white/40 mb-0.5">{label}</p>
    <p className="text-sm text-white">{value}</p>
  </div>
);
