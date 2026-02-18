import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gameDb } from '@/lib/gameSchema';
import { formatRelativeTime } from '@/lib/formatRelativeTime';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';

interface MemoryViewerProps {
  agentId: string;
}

interface MemoryRow {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  importance: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ROLE_STYLES: Record<string, { align: string; bg: string; label: string; text: string }> = {
  user: { align: 'items-end', bg: 'bg-blue-500/15 border-blue-500/20', label: 'Player', text: 'text-blue-400' },
  assistant: { align: 'items-start', bg: 'bg-green/15 border-green/20', label: 'NPC', text: 'text-green' },
  system: { align: 'items-center', bg: 'bg-white/5 border-white/10', label: 'System', text: 'text-white/50' },
  tool: { align: 'items-start', bg: 'bg-amber-500/15 border-amber-500/20', label: 'Tool', text: 'text-amber-400' },
};

const MetadataBlock: React.FC<{ metadata: Record<string, unknown> }> = ({ metadata }) => {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(metadata);
  if (keys.length === 0) return null;

  return (
    <button
      onClick={() => setOpen(!open)}
      className="mt-1.5 flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 transition-colors"
    >
      {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      <span>metadata ({keys.length})</span>
      {open && (
        <pre className="ml-2 text-left text-white/40 whitespace-pre-wrap break-all max-w-[400px]">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </button>
  );
};

export const MemoryViewer: React.FC<MemoryViewerProps> = ({ agentId }) => {
  const { data: messages = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['npc-memory', agentId],
    queryFn: async () => {
      const { data, error } = await gameDb()
        .from('agent_memory')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return ((data || []) as MemoryRow[]).reverse();
      /* handled above */
    },
    enabled: !!agentId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className="h-16 w-3/5 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
        <div className="flex items-center gap-2 text-sm text-white/50">
          <MessageSquare className="w-4 h-4" />
          <span>{messages.length} messages</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-white/50 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-white/30 py-12">
          <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No conversation history yet</p>
          <p className="text-xs mt-1">Messages will appear here once players interact with this NPC</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[50vh]">
          {messages.map((msg) => {
            const style = ROLE_STYLES[msg.role] || ROLE_STYLES.system;
            const isUser = msg.role === 'user';
            const isSystem = msg.role === 'system';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${style.align}`}
              >
                <div
                  className={`max-w-[80%] ${isSystem ? 'max-w-[90%]' : ''} px-3.5 py-2.5 rounded-xl border ${style.bg} ${isSystem ? 'text-center' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-medium uppercase tracking-wider ${style.text}`}>
                      {style.label}
                    </span>
                    {msg.importance !== 5 && (
                      <span className="text-[10px] text-white/20">★{msg.importance}</span>
                    )}
                  </div>
                  <p className={`text-sm text-white/80 whitespace-pre-wrap break-words ${isSystem ? 'italic text-white/50 text-xs' : ''}`}>
                    {msg.content}
                  </p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-white/20">
                      {formatRelativeTime(msg.created_at)}
                    </span>
                  </div>
                  <MetadataBlock metadata={msg.metadata} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
