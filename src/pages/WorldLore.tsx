import React, { useState } from 'react';
import { BookOpen, MessageSquare, Network } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoreUploader } from '@/components/lore/LoreUploader';
import { LoreEntryCard } from '@/components/lore/LoreEntryCard';
import { LorekeeperChat } from '@/components/lore/LorekeeperChat';
import { LoreNeuralNetwork } from '@/components/lore/LoreNeuralNetwork';
import { useWorldLoreEntries, useDeleteLoreEntry, type WorldLoreEntry } from '@/hooks/useWorldLore';
import type { KnowledgeGraph } from '@/components/lore/loreKnowledgeTypes';
import { cn } from '@/lib/utils';

interface WorldLoreProps {
  onNavigate: (page: string) => void;
}

export const WorldLore: React.FC<WorldLoreProps> = ({ onNavigate }) => {
  const { data: entries = [], isLoading } = useWorldLoreEntries();
  const deleteMutation = useDeleteLoreEntry();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'neural'>('chat');
  const [knowledgeGraph, setKnowledgeGraph] = useState<KnowledgeGraph | null>(null);

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) ?? null : null;

  const handleDelete = (entry: WorldLoreEntry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    deleteMutation.mutate(entry);
    if (selectedId === entry.id) setSelectedId(null);
  };

  const handleKnowledgeUpdate = (graph: KnowledgeGraph) => {
    setKnowledgeGraph(graph);
    setActiveTab('neural');
  };

  const handleNodeSelect = (loreEntryIds: string[]) => {
    // Try to find matching lore entry by title (since LLM returns titles)
    const match = entries.find(e => loreEntryIds.includes(e.title) || loreEntryIds.includes(e.id));
    if (match) setSelectedId(match.id);
  };

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
                  isSelected={selectedId === entry.id}
                  onClick={() => setSelectedId(selectedId === entry.id ? null : entry.id)}
                  onDelete={() => handleDelete(entry)}
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

          {/* Content */}
          {activeTab === 'chat' ? (
            <LorekeeperChat
              loreEntries={entries}
              selectedEntry={selectedEntry}
              onKnowledgeUpdate={handleKnowledgeUpdate}
            />
          ) : (
            <LoreNeuralNetwork
              graph={knowledgeGraph}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
};
