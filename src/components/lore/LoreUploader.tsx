import React, { useCallback, useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateLoreEntry, useExtractLoreText } from '@/hooks/useWorldLore';
import { useCreateFragment } from '@/hooks/useFragments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const LoreUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createMutation = useCreateLoreEntry();
  const extractMutation = useExtractLoreText();
  const createFragment = useCreateFragment();

  const needsServerExtraction = (file: File) => {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return (
      type === 'application/pdf' ||
      name.endsWith('.pdf') ||
      (!type.startsWith('text/') &&
        !name.endsWith('.md') &&
        !name.endsWith('.txt') &&
        !name.endsWith('.json'))
    );
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        let content: string | undefined;
        if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
          content = await file.text();
        }
        const entryType = file.type.startsWith('image/') ? 'image' : 'document';
        const title = file.name.replace(/\.[^/.]+$/, '');

        try {
          const entry = await createMutation.mutateAsync({ title, entry_type: entryType, content, file });

          if (needsServerExtraction(file)) {
            toast.info('Extracting document text...');
            const result = await extractMutation.mutateAsync({ entryId: entry.id, file });

            // Create a sealed fragment after extraction
            if (result?.totalChunks && result.totalChunks > 0) {
              await createFragment.mutateAsync({
                title: result.entryTitle || title,
                fragment_type: result.entryType || entryType,
                lore_entry_id: entry.id,
                total_chunks: result.totalChunks,
                storage_path: result.storagePath || null,
              });
            }
          } else if (content) {
            // For text files with inline content, also extract & create fragment
            const result = await extractMutation.mutateAsync({ entryId: entry.id, file });
            if (result?.totalChunks && result.totalChunks > 0) {
              await createFragment.mutateAsync({
                title,
                fragment_type: entryType,
                lore_entry_id: entry.id,
                total_chunks: result.totalChunks,
              });
            }
          }
        } catch {
          // Error already handled by mutation's onError
        }
      }
    },
    [createMutation, extractMutation, createFragment],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const handleNoteSubmit = async () => {
    if (!noteTitle.trim()) return;
    const entry = await createMutation.mutateAsync({
      title: noteTitle.trim(),
      entry_type: 'note',
      content: noteContent.trim() || undefined,
    });

    // Create fragment for notes too if they have content
    if (noteContent.trim()) {
      const result = await extractMutation.mutateAsync(entry.id);
      if (result?.totalChunks && result.totalChunks > 0) {
        await createFragment.mutateAsync({
          title: noteTitle.trim(),
          fragment_type: 'note',
          lore_entry_id: entry.id,
          total_chunks: result.totalChunks,
        });
      }
    }

    setNoteTitle('');
    setNoteContent('');
    setShowNoteForm(false);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
          isDragging ? 'border-green bg-green/5' : 'border-white/10 hover:border-white/20',
        )}
      >
        <Upload className={cn('w-8 h-8', isDragging ? 'text-green' : 'text-white/30')} />
        <p className="text-sm text-white/40">Drop files here or click to upload</p>
        <p className="text-xs text-white/20">PDF, TXT, MD, images</p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Quick note */}
      {showNoteForm ? (
        <div className="bg-dark-200 border border-white/5 rounded-xl p-3 space-y-2">
          <Input
            placeholder="Note title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="bg-dark-100 border-white/10"
          />
          <Textarea
            placeholder="Write your lore note..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="bg-dark-100 border-white/10 min-h-[80px]"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowNoteForm(false)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-green text-dark hover:bg-green-light"
              onClick={handleNoteSubmit}
              disabled={!noteTitle.trim() || createMutation.isPending}
            >
              Add Note
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="w-full border border-dashed border-white/10 text-white/40 hover:text-white hover:border-white/20"
          onClick={() => setShowNoteForm(true)}
        >
          <FileText className="w-4 h-4 mr-2" /> Add Lore Note
        </Button>
      )}
    </div>
  );
};
