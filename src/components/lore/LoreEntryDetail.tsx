import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { WorldLoreEntry } from '@/hooks/useWorldLore';
import { cn } from '@/lib/utils';

interface LoreEntryDetailProps {
  entryId: string;
  onNavigate: (page: string) => void;
}

interface ProgressStep {
  label: string;
  done: boolean;
  weight: number;
  evidence?: React.ReactNode;
}

const typeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="w-5 h-5" />,
  image: <Image className="w-5 h-5" />,
  audio: <Music className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  note: <StickyNote className="w-5 h-5" />,
};

export const LoreEntryDetail: React.FC<LoreEntryDetailProps> = ({ entryId, onNavigate }) => {
  const [expandedSteps, setExpandedSteps] = React.useState<Set<string>>(new Set());

  const toggleStep = (label: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

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

  // Fetch chunk count + sample chunks
  const { data: chunkData } = useQuery({
    queryKey: ['lore-entry-chunks-detail', entryId],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('lore_embeddings')
        .select('id, chunk_index, chunk_text', { count: 'exact' })
        .eq('entry_id', entryId)
        .order('chunk_index', { ascending: true })
        .limit(5);
      if (error) return { count: 0, samples: [] };
      return { count: count ?? 0, samples: data ?? [] };
    },
  });

  // Fetch linked fragment
  const { data: fragment } = useQuery({
    queryKey: ['lore-entry-fragment', entryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fragment_archive')
        .select('id, title, certainty_level, revealed_chunks, total_chunks, analysis, raw_content')
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
        <Button variant="ghost" onClick={() => onNavigate('world-lore')} className="text-white/70 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <p className="text-white/50">Entry not found.</p>
      </div>
    );
  }

  const meta = parseLoreMediaMeta(entry.metadata);
  const inferredType = meta?.media_type ?? inferMediaType(entry.file_type) ?? 'document';
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  const chunkCount = chunkData?.count ?? 0;
  const chunkSamples = chunkData?.samples ?? [];
  const fragFullyDeciphered = fragment ? fragment.total_chunks > 0 && fragment.revealed_chunks >= fragment.total_chunks : false;

  const steps: ProgressStep[] = [
    {
      label: 'File uploaded',
      done: !!entry.storage_path,
      weight: 15,
      evidence: entry.storage_path ? (
        <div className="space-y-1">
          {entry.file_name && <EvidenceRow label="File" value={entry.file_name} />}
          {entry.file_type && <EvidenceRow label="Type" value={entry.file_type} />}
          <EvidenceRow label="Path" value={entry.storage_path} />
        </div>
      ) : (
        <p className="text-xs text-white/30 italic">No file uploaded — this entry has inline content only.</p>
      ),
    },
    {
      label: 'Content extracted',
      done: !!entry.content,
      weight: 25,
      evidence: entry.content ? (
        <div className="space-y-1">
          <EvidenceRow label="Length" value={`${entry.content.length.toLocaleString()} characters`} />
          <div className="mt-1.5 p-2 rounded-lg bg-white/[0.03] border border-white/5">
            <p className="text-xs text-white/50 whitespace-pre-wrap line-clamp-4">{entry.content.slice(0, 500)}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/30 italic">Content not yet extracted. Run extraction to populate.</p>
      ),
    },
    {
      label: 'Summary generated',
      done: !!entry.summary,
      weight: 15,
      evidence: entry.summary ? (
        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
          <p className="text-xs text-white/50 whitespace-pre-wrap">{entry.summary}</p>
        </div>
      ) : (
        <p className="text-xs text-white/30 italic">No summary generated yet.</p>
      ),
    },
    {
      label: 'Tags assigned',
      done: tags.length > 0,
      weight: 10,
      evidence: tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-green/10 text-green font-medium">
              {String(tag)}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/30 italic">No tags assigned yet.</p>
      ),
    },
    {
      label: 'Chunks indexed',
      done: chunkCount > 0,
      weight: 15,
      evidence: chunkCount > 0 ? (
        <div className="space-y-1.5">
          <EvidenceRow label="Total chunks" value={String(chunkCount)} />
          {chunkSamples.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-white/30 uppercase tracking-wide">Sample chunks:</p>
              {chunkSamples.slice(0, 3).map((c: any) => (
                <div key={c.id} className="p-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <span className="text-[10px] text-green font-medium mr-2">#{c.chunk_index}</span>
                  <span className="text-xs text-white/40">{c.chunk_text?.slice(0, 150)}…</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-white/30 italic">No chunks indexed. Extract content first.</p>
      ),
    },
    {
      label: 'Fragment created',
      done: !!fragment,
      weight: 10,
      evidence: fragment ? (
        <div className="space-y-1">
          <EvidenceRow label="Fragment" value={fragment.title} />
          <EvidenceRow label="Certainty" value={fragment.certainty_level} />
          <EvidenceRow label="Chunks" value={`${fragment.revealed_chunks}/${fragment.total_chunks} revealed`} />
        </div>
      ) : (
        <p className="text-xs text-white/30 italic">No fragment created yet. Seal entry to create one.</p>
      ),
    },
    {
      label: 'Fully deciphered',
      done: fragFullyDeciphered,
      weight: 10,
      evidence: fragment ? (
        fragFullyDeciphered ? (
          <p className="text-xs text-green">All {fragment.total_chunks} chunks revealed. Fragment fully deciphered.</p>
        ) : (
          <p className="text-xs text-amber-400">{fragment.revealed_chunks} of {fragment.total_chunks} chunks revealed — {Math.round((fragment.revealed_chunks / Math.max(fragment.total_chunks, 1)) * 100)}% complete.</p>
        )
      ) : (
        <p className="text-xs text-white/30 italic">Create a fragment first.</p>
      ),
    },
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
      <Button variant="ghost" onClick={() => onNavigate('world-lore')} className="text-white/70 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to World Lore
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

        {/* Progress with evidence */}
        <div className="bg-dark-100 rounded-xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Deciphering Progress</h2>
            <span className={cn('text-sm font-bold', progress === 100 ? 'text-green' : 'text-white/70')}>{progress}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-5">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700',
                progress === 100 ? 'bg-green' : progress >= 50 ? 'bg-amber-400' : 'bg-white/20'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="space-y-1">
            {steps.map((step) => {
              const isExpanded = expandedSteps.has(step.label);
              return (
                <div key={step.label}>
                  <button
                    onClick={() => toggleStep(step.label)}
                    className="w-full flex items-center gap-3 py-1.5 px-1 rounded-md hover:bg-white/[0.03] transition-colors text-left"
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-4 h-4 text-green shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-white/20 shrink-0" />
                    )}
                    <span className={cn('text-sm flex-1', step.done ? 'text-white' : 'text-white/40')}>{step.label}</span>
                    <span className="text-xs text-white/20 mr-2">{step.weight}%</span>
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    )}
                  </button>
                  {isExpanded && step.evidence && (
                    <div className="ml-7 mr-2 mb-2 mt-0.5 pl-3 border-l border-white/5">
                      {step.evidence}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Media metadata */}
        {meta && (
          <div className="bg-dark-100 rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-medium text-white mb-4">Media Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {meta.media_type === 'document' && (
                <>
                  {meta.page_count != null && <EvidenceRow label="Pages" value={String(meta.page_count)} />}
                  {meta.word_count != null && <EvidenceRow label="Words" value={meta.word_count.toLocaleString()} />}
                  {meta.language && <EvidenceRow label="Language" value={meta.language} />}
                </>
              )}
              {meta.media_type === 'image' && (
                <>
                  {meta.width != null && meta.height != null && <EvidenceRow label="Dimensions" value={`${meta.width}×${meta.height}`} />}
                  {meta.scene_description && <EvidenceRow label="Scene" value={meta.scene_description} />}
                </>
              )}
              {(meta.media_type === 'audio' || meta.media_type === 'video') && (
                <>
                  {meta.duration_seconds != null && <EvidenceRow label="Duration" value={`${Math.round(meta.duration_seconds)}s`} />}
                  {meta.transcript_status && <EvidenceRow label="Transcript" value={meta.transcript_status} />}
                </>
              )}
              {meta.media_type === 'note' && (
                <>
                  {meta.source && <EvidenceRow label="Source" value={meta.source} />}
                  {meta.category && <EvidenceRow label="Category" value={meta.category} />}
                </>
              )}
            </div>
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

const EvidenceRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-baseline gap-2">
    <span className="text-[10px] text-white/30 uppercase tracking-wide shrink-0">{label}</span>
    <span className="text-xs text-white/60">{value}</span>
  </div>
);