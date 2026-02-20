import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Bot, User, Pencil, Play, Square, Trash2 } from 'lucide-react';
import { useChatWithAgent } from '@/hooks/usePicoClawAgents';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentChatTestProps {
  agentId: string;
  agentName: string;
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
  const chatMutation = useChatWithAgent();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset messages when switching agents
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [agentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    try {
      const result = await chatMutation.mutateAsync({
        agentId,
        message: text,
        sessionId: `studio-test-${agentId}`,
      });
      if (result?.response) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
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

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 p-3 border-t border-white/5"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
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
