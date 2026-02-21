import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, BookOpen, User, Library, Network } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { loadStudioMemory, saveStudioMemory } from '@/lib/studioMemoryService';
import { cn } from '@/lib/utils';
import type { WorldLoreEntry } from '@/hooks/useWorldLore';
import type { KnowledgeGraph } from './loreKnowledgeTypes';
import { parseKnowledgeGraph } from './loreKnowledgeTypes';

const LOREKEEPER_NPC_ID = 'the-lorekeeper';
const STUDIO_PLAYER_ID = 'studio-user';
const SESSION_ID = `${LOREKEEPER_NPC_ID}_${STUDIO_PLAYER_ID}`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LorekeeperChatProps {
  loreEntries: WorldLoreEntry[];
  selectedEntry?: WorldLoreEntry | null;
  onKnowledgeUpdate?: (graph: KnowledgeGraph) => void;
}

/**
 * Try picoclaw-bridge first; if it fails (PicoClaw unreachable), fall back to npc-ai-chat.
 * Returns the assistant's response text.
 */
async function callLorekeeper(
  agentConfig: any,
  messageText: string,
  history: { role: string; content: string }[],
): Promise<string> {
  // --- Primary: picoclaw-bridge ---
  if (agentConfig?.id) {
    try {
      const { data, error } = await supabase.functions.invoke('picoclaw-bridge', {
        body: {
          action: 'chat',
          agentId: agentConfig.id,
          message: messageText,
          sessionId: SESSION_ID,
        },
      });

      if (!error && data?.success && data?.response) {
        return data.response;
      }
      // If bridge returned an error object, log and fall through to fallback
      console.warn('[LorekeeperChat] Bridge error, falling back:', data?.error || error);
    } catch (bridgeErr) {
      console.warn('[LorekeeperChat] Bridge unreachable, falling back to npc-ai-chat:', bridgeErr);
    }
  }

  // --- Fallback: npc-ai-chat ---
  const personality = agentConfig?.soul_md || 'You are the Lorekeeper, a world-building assistant.';
  const config = {
    name: 'The Lorekeeper',
    personality,
    model: { conversation: agentConfig?.llm_model || 'gemini-2.5-pro' },
    skills: [],
  };

  const { data, error } = await supabase.functions.invoke('npc-ai-chat', {
    body: {
      npcId: LOREKEEPER_NPC_ID,
      playerId: STUDIO_PLAYER_ID,
      playerName: 'Studio User',
      message: messageText,
      config,
      history,
    },
  });

  if (error) throw error;
  return data?.text || '[No response]';
}

export const LorekeeperChat: React.FC<LorekeeperChatProps> = ({ loreEntries, selectedEntry, onKnowledgeUpdate }) => {
  const [isMappingWorld, setIsMappingWorld] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [agentConfig, setAgentConfig] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch the Lorekeeper's config on mount
  useEffect(() => {
    (async () => {
      const { data: agent } = await supabase
        .from('picoclaw_agents')
        .select('*')
        .eq('picoclaw_agent_id', LOREKEEPER_NPC_ID)
        .single();
      if (agent) setAgentConfig(agent);

      const history = await loadStudioMemory(LOREKEEPER_NPC_ID, SESSION_ID, 50);
      if (history.length > 0) {
        setMessages(history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })));
      }
      setIsLoadingHistory(false);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const buildLoreContext = async (includeAll: boolean) => {
    const entries = includeAll ? loreEntries : selectedEntry ? [selectedEntry] : [];
    if (!entries.length) return '';
    const parts: string[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      let body = e.content || e.summary || '';

      // Fallback: fetch text-based files from storage if content is missing
      if (!body && e.storage_path) {
        try {
          const fileName = (e.file_name || '').toLowerCase();
          const fileType = (e.file_type || '').toLowerCase();
          const isTextFile =
            fileType.startsWith('text/') ||
            fileName.endsWith('.txt') ||
            fileName.endsWith('.md') ||
            fileName.endsWith('.json') ||
            fileName.endsWith('.csv');
          if (isTextFile) {
            const { data } = await supabase.storage.from('world-lore').download(e.storage_path);
            if (data) body = await data.text();
          }
        } catch {
          // Silently fail — entry just won't have context
        }
      }

      if (!body) body = '(no text content)';
      parts.push(`--- Lore Entry ${i + 1}: "${e.title}" [${e.entry_type}] ---\n${body}`);
    }
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
      const contextStr = await buildLoreContext(text.toLowerCase().includes('review all'));
      const messageWithContext = contextStr ? text + contextStr : text;
      const recentHistory = messages.slice(-20).map((m) => ({ role: m.role, content: m.content }));

      const responseText = await callLorekeeper(agentConfig, messageWithContext, recentHistory);
      setMessages((prev) => [...prev, { role: 'assistant', content: responseText }]);

      // Persist both messages to agent_memory (bridge doesn't do this automatically)
      await saveStudioMemory(LOREKEEPER_NPC_ID, SESSION_ID, [
        { role: 'user', content: text },
        { role: 'assistant', content: responseText },
      ]);
    } catch (err: any) {
      console.error('[LorekeeperChat] Error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: `[Error: ${err?.message ?? 'could not reach Lorekeeper'}]` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewAll = () => {
    handleSend('Review all lore entries. Identify themes, contradictions, connections, and suggest how they weave together into a cohesive world narrative.');
  };

  const handleMapWorld = async () => {
    if (!loreEntries.length || isMappingWorld) return;
    setIsMappingWorld(true);

    const contextStr = await buildLoreContext(true);
    const mapPrompt = `Analyze all provided lore entries. Extract every named character, location, faction, event, and notable item. For each, provide:
- id: a short unique slug
- label: display name
- type: one of "character", "location", "faction", "event", "item", "concept"
- description: one sentence
- confidence: 0-1 (how well-defined)
- loreEntryIds: array of lore entry titles that mention this entity

Then identify all relationships between entities with:
- source: entity id
- target: entity id
- label: relationship type (e.g. "allied_with", "located_in", "enemy_of")
- strength: 0-1

Return ONLY valid JSON: {"nodes": [...], "edges": [...]}` + contextStr;

    const userMsg: ChatMessage = { role: 'user', content: 'Map the world — analyze all lore and build a knowledge graph.' };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const recentHistory = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const responseText = await callLorekeeper(agentConfig, mapPrompt, recentHistory);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Knowledge graph generated! Switch to the Neural Map tab to explore.' }]);

      // Persist memory
      await saveStudioMemory(LOREKEEPER_NPC_ID, SESSION_ID, [
        { role: 'user', content: 'Map the world — analyze all lore and build a knowledge graph.' },
        { role: 'assistant', content: responseText },
      ]);

      const parsed = parseKnowledgeGraph(responseText);
      if (parsed && onKnowledgeUpdate) {
        onKnowledgeUpdate(parsed);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: '[Could not parse knowledge graph from response. Try again.]' }]);
      }
    } catch (err: any) {
      console.error('[LorekeeperChat] Map World Error:', err);
      setMessages((prev) => [...prev, { role: 'assistant', content: `[Error mapping world: ${err?.message ?? 'unknown'}]` }]);
    } finally {
      setIsLoading(false);
      setIsMappingWorld(false);
    }
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
            <p className="text-xs text-white/30">
              {isLoadingHistory ? 'Loading memory...' : `${messages.length} messages in memory`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-white/40 hover:text-white"
            onClick={handleMapWorld}
            disabled={isLoading || isMappingWorld || !loreEntries.length}
          >
            <Network className="w-3.5 h-3.5 mr-1.5" /> {isMappingWorld ? 'Mapping...' : 'Map World'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-white/40 hover:text-white"
            onClick={handleReviewAll}
            disabled={isLoading || !loreEntries.length}
          >
            <Library className="w-3.5 h-3.5 mr-1.5" /> Review All
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoadingHistory ? (
          <div className="text-center pt-12 space-y-2">
            <Loader2 className="w-6 h-6 text-white/20 mx-auto animate-spin" />
            <p className="text-sm text-white/20">Restoring conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center pt-12 space-y-2">
            <BookOpen className="w-10 h-10 text-white/10 mx-auto" />
            <p className="text-sm text-white/20">
              Upload lore documents, then chat with the Lorekeeper to weave your world together.
            </p>
            {loreEntries.length > 0 && (
              <p className="text-xs text-white/15">{loreEntries.length} lore entries available</p>
            )}
          </div>
        ) : null}
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
