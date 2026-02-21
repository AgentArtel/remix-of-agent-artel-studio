import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, MessageSquare, Network, Layers, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { LoreUploader } from '@/components/lore/LoreUploader';
import { LoreEntryCard } from '@/components/lore/LoreEntryCard';
import { FragmentCard } from '@/components/lore/FragmentCard';
import { LorekeeperChat } from '@/components/lore/LorekeeperChat';
import { LoreNeuralNetwork } from '@/components/lore/LoreNeuralNetwork';
import { LoreEntryDetail } from '@/components/lore/LoreEntryDetail';
import { useWorldLoreEntries, useDeleteLoreEntry, useLoreChunkCounts, useExtractLoreText, type WorldLoreEntry } from '@/hooks/useWorldLore';
import { useFragments, useDecipherFragment, useCreateFragment } from '@/hooks/useFragments';
import type { KnowledgeGraph } from '@/components/lore/loreKnowledgeTypes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WorldLoreProps {
  onNavigate: (page: string) => void;
  initialTab?: 'chat' | 'fragments' | 'neural';
}

export const WorldLore: React.FC<WorldLoreProps> = ({ onNavigate, initialTab }) => {
  const { data: entries = [], isLoading } = useWorldLoreEntries();
  const { data: chunkCounts = {} } = useLoreChunkCounts();
  const { data: fragments = [], isLoading: fragmentsLoading } = useFragments();
  const deleteMutation = useDeleteLoreEntry();
  const decipherMutation = useDecipherFragment();
  const createFragment = useCreateFragment();
  const extractMutation = useExtractLoreText();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'fragments' | 'neural'>(initialTab ?? 'chat');
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null);
  const [decipheringId, setDecipheringId] = useState<string | null>(null);
  const [isBulkConverting, setIsBulkConverting] = useState(false);

  // Entries that have no linked fragment (either have chunks already, or have content that can be chunked)
  const unconvertedEntries = entries.filter(
    (e) =>
      !fragments.some((f) => f.lore_entry_id === e.id) &&
      (chunkCounts[e.id] > 0 || e.content || e.storage_path),
  );

  const handleBulkConvert = useCallback(async () => {
    if (unconvertedEntries.length === 0) return;
    setIsBulkConverting(true);
    let created = 0;
    for (const entry of unconvertedEntries) {
      try {
        let chunks = chunkCounts[entry.id] ?? 0;

        // If no chunks yet but entry has content, run extraction to generate them
        if (chunks === 0 && (entry.content || entry.storage_path)) {
          toast.info(`Extracting "${entry.title}"…`);
          try {
            const result = await extractMutation.mutateAsync(entry.id);
            chunks = result?.totalChunks ?? 0;
          } catch (e) {
            console.warn(`Extraction failed for ${entry.title}, creating fragment anyway:`, e);
            // Still create a fragment with 0 chunks — user can retry later
          }
          // Small pause between entries to avoid overwhelming the browser
          await new Promise(r => setTimeout(r, 500));
        }

        await createFragment.mutateAsync({
          title: entry.title,
          fragment_type: entry.entry_type,
          lore_entry_id: entry.id,
          total_chunks: chunks,
          storage_path: entry.storage_path,
        });
        created++;
      } catch (e) {
        console.warn(`Failed to create fragment for ${entry.title}:`, e);
      }
    }
    setIsBulkConverting(false);
    toast.success(`Sealed ${created} new fragment${created !== 1 ? 's' : ''}`);
  }, [unconvertedEntries, chunkCounts, createFragment, extractMutation]);

  // Load persisted knowledge graph on mount
  useEffect(() => {
    supabase
      .from('world_lore_entries')
      .select('metadata')
      .eq('entry_type', 'knowledge_graph')
      .maybeSingle()
      .then(({ data }) => {
        const meta = data?.metadata as Record<string, unknown> | null;
        if (meta?.graph) setKnowledgeGraph(meta.graph as KnowledgeGraph);
      });
  }, []);

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) ?? null : null;

  const handleDelete = (entry: WorldLoreEntry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    deleteMutation.mutate(entry);
    if (selectedId === entry.id) setSelectedId(null);
  };

  const handleDecipher = async (fragmentId: string) => {
    setDecipheringId(fragmentId);
    try {
      await decipherMutation.mutateAsync({ fragmentId, chunksToReveal: 3 });
    } finally {
      setDecipheringId(null);
    }
  };

  const handleKnowledgeUpdate = async (graph: KnowledgeGraph) => {
    setKnowledgeGraph(graph);
    setActiveTab('neural');

    const { data: existing } = await supabase
      .from('world_lore_entries')
      .select('id')
      .eq('entry_type', 'knowledge_graph')
      .maybeSingle();

    if (existing) {
      await supabase.from('world_lore_entries')
        .update({ metadata: { graph } as any, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      await supabase.from('world_lore_entries')
        .insert([{ title: 'Knowledge Graph', entry_type: 'knowledge_graph', metadata: { graph } as any }]);
    }
  };

  const handleNodeSelect = (loreEntryIds: string[]) => {
    const match = entries.find(e => loreEntryIds.includes(e.title) || loreEntryIds.includes(e.id));
    if (match) setSelectedId(match.id);
  };

  // Count fragments that need deciphering
  const sealedCount = fragments.filter(f => f.certainty_level === 'sealed' || f.revealed_chunks < f.total_chunks).length;

  return (
    <div className="min-h-screen bg-dark text-white p-6 flex flex-col">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">World Lore</h1>
            <p className="text-white/50 mt-0.5">Upload documents and craft your narrative with the Lorekeeper</p>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left — Upload + List */}
        <div className="w-[380px] shrink-0 flex flex-col gap-4 min-h-[600px]">
          <LoreUploader />

          <div className="flex-1 overflow-y-auto space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[72px] rounded-xl" />
              ))
            ) : entries.length === 0 ? (
              <p className="text-sm text-white/20 text-center pt-8">
                No lore entries yet. Upload files or add notes above.
              </p>
            ) : (
              entries.map((entry) => (
                <LoreEntryCard
                  key={entry.id}
                  entry={entry}
                  isSelected={detailId === entry.id}
                  onClick={() => { setDetailId(entry.id); setSelectedId(entry.id); }}
                  onDelete={() => handleDelete(entry)}
                  chunkCount={chunkCounts[entry.id]}
                  fragment={fragments.find((f) => f.lore_entry_id === entry.id) ?? null}
                />
              ))
            )}
          </div>
        </div>

        {/* Right — Tab toggle + Content */}
        <div className="flex-1 flex flex-col min-h-[600px] gap-3">
          {/* Tabs */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 self-start">
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === 'chat'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('fragments')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === 'fragments'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Fragments
              {sealedCount > 0 && (
                <span className="ml-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1">
                  {sealedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('neural')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === 'neural'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60',
                knowledgeGraph ? '' : 'opacity-50'
              )}
            >
              <Network className="w-3.5 h-3.5" />
              Neural Map
              {knowledgeGraph && (
                <span className="w-1.5 h-1.5 rounded-full bg-green ml-1" />
              )}
            </button>
          </div>

          {/* Content — toggle via CSS for state preservation */}
          <div className={activeTab !== 'chat' ? 'hidden' : 'flex-1 flex flex-col'}>
            <LorekeeperChat
              loreEntries={entries}
              selectedEntry={selectedEntry}
              onKnowledgeUpdate={handleKnowledgeUpdate}
            />
          </div>

          <div className={activeTab !== 'fragments' ? 'hidden' : 'flex-1 flex flex-col'}>
            <div className="flex-1 overflow-y-auto bg-dark-200 rounded-xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Fragment Archive</h3>
                  <p className="text-xs text-white/30 mt-0.5">
                    Decipher fragments to reveal knowledge for the Lorekeeper
                  </p>
                </div>
                {unconvertedEntries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    onClick={handleBulkConvert}
                    disabled={isBulkConverting}
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', isBulkConverting && 'animate-spin')} />
                    Seal {unconvertedEntries.length} existing
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {fragmentsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-[80px] rounded-xl" />
                  ))
                ) : fragments.length === 0 ? (
                  <div className="text-center pt-12 space-y-2">
                    <Layers className="w-10 h-10 text-white/10 mx-auto" />
                    <p className="text-sm text-white/20">
                      No fragments yet. Upload documents to create fragments.
                    </p>
                  </div>
                ) : (
                  fragments.map((fragment) => (
                    <FragmentCard
                      key={fragment.id}
                      fragment={fragment}
                      onDecipher={handleDecipher}
                      isDeciphering={decipheringId === fragment.id}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={activeTab !== 'neural' ? 'hidden' : 'flex-1 flex flex-col'}>
            <LoreNeuralNetwork
              graph={knowledgeGraph}
              onNodeSelect={handleNodeSelect}
            />
          </div>
        </div>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailId} onOpenChange={(open) => { if (!open) setDetailId(null); }}>
        <SheetContent side="right" className="w-[520px] sm:max-w-[520px] bg-dark border-white/5 p-0 overflow-y-auto">
          {detailId && (
            <LoreEntryDetail
              entryId={detailId}
              onNavigate={onNavigate}
              embedded
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
