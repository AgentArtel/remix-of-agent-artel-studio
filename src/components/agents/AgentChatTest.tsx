import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Bot, User, Pencil, Play, Square, Trash2, ScrollText, X, ChevronDown } from 'lucide-react';
import { useChatWithAgent } from '@/hooks/usePicoClawAgents';
import { useFragments, Fragment } from '@/hooks/useFragments';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  fragmentDelivered?: string;
}

interface AgentChatTestProps {
  agentId: string;
  agentName: string;
  agentConfigId?: string | null;
  status?: string;
  llmBackend?: string;
  llmModel?: string;
  onEdit?: () => void;
  onDeploy?: () => void;
  onStop?: () => void;
  onDelete?: () => void;
}

export const AgentChatTest: React.FC<AgentChatTestProps> = ({
  agentId,
  agentName,
  agentConfigId,
  status,
  llmBackend,
  llmModel,
  onEdit,
  onDeploy,
  onStop,
  onDelete,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedFragment, setSelectedFragment] = useState<Fragment | null>(null);
  const [showFragmentPicker, setShowFragmentPicker] = useState(false);
  const chatMutation = useChatWithAgent();
  const { data: fragments } = useFragments();
  const scrollRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Reset messages when switching agents
  useEffect(() => {
    setMessages([]);
    setInput('');
    setSelectedFragment(null);
  }, [agentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowFragmentPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    const fragment = selectedFragment;
    setInput('');
    setSelectedFragment(null);

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      ...(fragment ? { fragmentDelivered: fragment.title } : {}),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      if (fragment && agentConfigId) {
        // Call npc-ai-chat directly for fragment delivery
        const { data, error } = await supabase.functions.invoke('npc-ai-chat', {
          body: {
            npcId: agentConfigId,
            playerId: 'studio-tester',
            playerName: 'Studio Tester',
            message: text,
            fragmentId: fragment.id,
            config: {
              model: llmModel || 'gemini-2.5-flash',
              provider: llmBackend || 'gemini',
              temperature: 0.7,
            },
          },
        });
        if (error) throw error;
        const reply = data?.response || data?.text || '[No response]';
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        // Standard chat through PicoClaw bridge
        const result = await chatMutation.mutateAsync({
          agentId,
          message: text,
          sessionId: `studio-test-${agentId}`,
        });
        if (result?.response) {
          setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '[Error: could not reach agent]' },
      ]);
    }
  };
  const isRunning = status === 'running' || status === 'deployed';
  const statusLabel = status ?? 'draft';

  return (
    <div className="flex flex-col h-full bg-dark-200 rounded-xl border border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-green" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white truncate">{agentName}</span>
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium',
                  isRunning
                    ? 'bg-green/15 text-green'
                    : 'bg-white/5 text-white/40',
                )}
              >
                {statusLabel}
              </span>
            </div>
            {llmBackend && llmModel && (
              <span className="text-xs text-white/30">{llmBackend}/{llmModel}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          {isRunning && onStop && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white" onClick={onStop}>
              <Square className="w-3.5 h-3.5" />
            </Button>
          )}
          {!isRunning && onDeploy && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-green" onClick={onDeploy}>
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-destructive" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-white/20 text-center pt-12">
            Send a message to test <span className="text-white/40">{agentName}</span>
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-green" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[80%] px-3 py-2 rounded-xl text-sm',
                msg.role === 'user'
                  ? 'bg-green/20 text-white'
                  : 'bg-white/5 text-white/80',
              )}
            >
              {msg.fragmentDelivered && (
                <div className="flex items-center gap-1.5 mb-1 text-xs text-green/80">
                  <ScrollText className="w-3 h-3" />
                  <span>Delivering: {msg.fragmentDelivered}</span>
                </div>
              )}
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-white/60" />
              </div>
            )}
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-green/20 flex items-center justify-center shrink-0">
              <Loader2 className="w-3.5 h-3.5 text-green animate-spin" />
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5 text-sm text-white/40">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Selected fragment badge */}
      {selectedFragment && (
        <div className="flex items-center gap-2 px-3 pt-2 border-t border-white/5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green/10 text-green text-xs">
            <ScrollText className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{selectedFragment.title}</span>
            <button onClick={() => setSelectedFragment(null)} className="ml-1 hover:text-white transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[10px] text-white/30">{selectedFragment.fragment_type}</span>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 p-3 border-t border-white/5"
      >
        {/* Fragment picker */}
        <div className="relative" ref={pickerRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 w-9 shrink-0',
              selectedFragment ? 'text-green' : 'text-white/40 hover:text-white',
            )}
            onClick={() => setShowFragmentPicker(!showFragmentPicker)}
            title="Deliver a fragment"
          >
            <ScrollText className="w-4 h-4" />
          </Button>

          {showFragmentPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-72 max-h-64 overflow-y-auto rounded-xl bg-dark-100 border border-white/10 shadow-xl z-50 scrollbar-thin">
              <div className="px-3 py-2 border-b border-white/5">
                <span className="text-xs text-white/40 uppercase tracking-wider">Select Fragment</span>
              </div>
              {!fragments?.length ? (
                <p className="px-3 py-4 text-xs text-white/30 text-center">No fragments available</p>
              ) : (
                fragments.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={cn(
                      'w-full px-3 py-2 text-left hover:bg-white/5 transition-colors',
                      selectedFragment?.id === f.id && 'bg-green/10',
                    )}
                    onClick={() => {
                      setSelectedFragment(f);
                      setShowFragmentPicker(false);
                    }}
                  >
                    <span className="block text-sm text-white/80 truncate">{f.title}</span>
                    <span className="flex items-center gap-2 text-[10px] text-white/30 mt-0.5">
                      <span>{f.fragment_type}</span>
                      <span>•</span>
                      <span>{f.certainty_level}</span>
                      <span>•</span>
                      <span>{f.revealed_chunks}/{f.total_chunks} chunks</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedFragment ? `Deliver "${selectedFragment.title}"...` : 'Type a message...'}
          className="bg-dark-100 border-white/10 flex-1"
          disabled={chatMutation.isPending}
        />
        <Button
          type="submit"
          size="icon"
          className="bg-green text-dark hover:bg-green-light shrink-0"
          disabled={chatMutation.isPending || !input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
