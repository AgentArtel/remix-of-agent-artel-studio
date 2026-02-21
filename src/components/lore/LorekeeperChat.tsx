import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, BookOpen, User, Library } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { geminiChat } from '@/lib/geminiServices';
import { cn } from '@/lib/utils';
import type { WorldLoreEntry } from '@/hooks/useWorldLore';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LorekeeperChatProps {
  loreEntries: WorldLoreEntry[];
  selectedEntry?: WorldLoreEntry | null;
}

export const LorekeeperChat: React.FC<LorekeeperChatProps> = ({ loreEntries, selectedEntry }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch the Lorekeeper's soul_md on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('picoclaw_agents')
        .select('soul_md')
        .eq('picoclaw_agent_id', 'the-lorekeeper')
        .single();
      if (data) setSystemPrompt((data as any).soul_md);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildContext = (includeAll: boolean) => {
    const entries = includeAll ? loreEntries : selectedEntry ? [selectedEntry] : [];
    if (!entries.length) return '';
    const parts = entries.map((e, i) => {
      const body = e.content || e.summary || '(no text content)';
      return `--- Lore Entry ${i + 1}: \"${e.title}\" [${e.entry_type}] ---\n${body}`;
    });
    return '\n\n[LORE CONTEXT]\n' + parts.join('\n\n');
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText ?? input.trim();
    if (!text || isLoading) return;
    if (!overrideText) setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const contextStr = buildContext(text.toLowerCase().includes('review all'));
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      // Inject lore context into the latest user message
      if (contextStr) {
        const last = allMessages[allMessages.length - 1];
        last.content = last.content + contextStr;
      }

      const result = await geminiChat({
        messages: allMessages,
        systemPrompt: systemPrompt ?? undefined,
        model: 'gemini-2.5-pro',
        temperature: 0.7,
        maxTokens: 8192,
      });

      if (result.success && result.text) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.text! }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `[Error: ${result.error ?? 'unknown'}]` }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '[Error: could not reach Lorekeeper]' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewAll = () => {
    handleSend('Review all lore entries. Identify themes, contradictions, connections, and suggest how they weave together into a cohesive world narrative.');
  };

  return (
    <div className="flex flex-col h-full bg-dark-200 rounded-xl border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">The Lorekeeper</span>
            <p className="text-xs text-white/30">World-building assistant</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-white/40 hover:text-white"
          onClick={handleReviewAll}
          disabled={isLoading || !loreEntries.length}
        >
          <Library className="w-3.5 h-3.5 mr-1.5" /> Review All Lore
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center pt-12 space-y-2">
            <BookOpen className="w-10 h-10 text-white/10 mx-auto" />
            <p className="text-sm text-white/20">
              Upload lore documents, then chat with the Lorekeeper to weave your world together.
            </p>
            {loreEntries.length > 0 && (
              <p className="text-xs text-white/15">{loreEntries.length} lore entries available</p>
            )}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap',
                msg.role === 'user' ? 'bg-green/20 text-white' : 'bg-white/5 text-white/80',
              )}
            >
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-white/60" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5 text-sm text-white/40">Thinking...</div>
          </div>
        )}
      </div>

      {/* Selected entry indicator */}
      {selectedEntry && (
        <div className="px-4 py-1.5 border-t border-white/5 text-xs text-white/30">
          Contextualizing: <span className="text-white/50">{selectedEntry.title}</span>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="flex gap-2 p-3 border-t border-white/5"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the Lorekeeper..."
          className="bg-dark-100 border-white/10 flex-1"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          className="bg-green text-dark hover:bg-green-light shrink-0"
          disabled={isLoading || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
