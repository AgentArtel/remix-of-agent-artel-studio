import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lightbulb, Plus, Trash2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { cn } from '@/lib/utils';

interface Idea {
  id: string;
  content: string;
  tag: string | null;
  created_at: string;
}

const TAG_OPTIONS = ['NPC', 'Map', 'Gameplay', 'UI', 'Story', 'Bug', 'Feature'];

export const Ideas = ({ onNavigate }: { onNavigate: (p: string) => void }) => {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<string | null>(null);

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ['studio_ideas'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('studio_ideas')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Idea[];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('studio_ideas')
        .insert({ content: content.trim(), tag });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio_ideas'] });
      setContent('');
      setTag(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('studio_ideas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['studio_ideas'] }),
  });

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ideas</h1>
          <p className="text-sm text-muted-foreground">Dump ideas here, sort them later.</p>
        </div>
      </div>

      {/* Input */}
      <div className="bg-dark-100 border border-white/5 rounded-2xl p-4 mb-8 space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={3}
          className="w-full bg-dark-200 border border-white/5 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-green/50 transition-colors"
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {TAG_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? null : t)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                  tag === t
                    ? 'bg-green/20 border-green/40 text-green'
                    : 'bg-dark-200 border-white/10 text-muted-foreground hover:border-white/20'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={() => addMut.mutate()}
            disabled={!content.trim() || addMut.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green text-dark text-sm font-semibold hover:bg-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No ideas yet. Start dumping!</p>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-dark-100 border border-white/5 rounded-xl p-4 flex items-start gap-3 group hover:border-white/10 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground whitespace-pre-wrap">{idea.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  {idea.tag && (
                    <span className="px-2 py-0.5 rounded-full bg-green/10 text-green text-xs font-medium">
                      {idea.tag}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(idea.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => deleteMut.mutate(idea.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
