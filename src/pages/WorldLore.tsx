import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoreUploader } from '@/components/lore/LoreUploader';
import { LoreEntryCard } from '@/components/lore/LoreEntryCard';
import { LorekeeperChat } from '@/components/lore/LorekeeperChat';
import { useWorldLoreEntries, useDeleteLoreEntry, type WorldLoreEntry } from '@/hooks/useWorldLore';

interface WorldLoreProps {
  onNavigate: (page: string) => void;
}

export const WorldLore: React.FC<WorldLoreProps> = ({ onNavigate }) => {
  const { data: entries = [], isLoading } = useWorldLoreEntries();
  const deleteMutation = useDeleteLoreEntry();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEntry = selectedId ? entries.find((e) => e.id === selectedId) ?? null : null;

  const handleDelete = (entry: WorldLoreEntry) => {
    if (!window.confirm(`Delete "${entry.title}"?`)) return;
    deleteMutation.mutate(entry);
    if (selectedId === entry.id) setSelectedId(null);
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

        {/* Right — Chat */}
        <div className="flex-1 flex flex-col min-h-[600px]">
          <LorekeeperChat loreEntries={entries} selectedEntry={selectedEntry} />
        </div>
      </div>
    </div>
  );
};
