import { supabase } from '@/integrations/supabase/client';

export interface MemoryMessage {
  role: string;
  content: string;
}

/**
 * Load the last N messages for a given NPC session from agent_memory.
 */
export async function loadMemory(
  npcId: string,
  sessionId: string,
  windowSize: number = 10
): Promise<MemoryMessage[]> {
  const { data, error } = await supabase
    .from('agent_memory')
    .select('role, content')
    .eq('npc_id', npcId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(windowSize);

  if (error) {
    console.error('[MemoryService] Failed to load memory:', error);
    return [];
  }

  return (data || []).reverse().map((row) => ({
    role: row.role,
    content: row.content,
  }));
}

/**
 * Save messages to agent_memory for a given session.
 */
export async function saveMemory(
  npcId: string,
  playerId: string,
  sessionId: string,
  messages: MemoryMessage[]
): Promise<void> {
  const rows = messages.map((msg) => ({
    npc_id: npcId,
    player_id: playerId,
    session_id: sessionId,
    role: msg.role,
    content: msg.content,
  }));

  const { error } = await supabase
    .from('agent_memory')
    .insert(rows);

  if (error) {
    console.error('[MemoryService] Failed to save memory:', error);
  }
}

/**
 * Clear all memory for a given session.
 */
export async function clearMemory(npcId: string, sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('agent_memory')
    .delete()
    .eq('npc_id', npcId)
    .eq('session_id', sessionId);

  if (error) {
    console.error('[MemoryService] Failed to clear memory:', error);
  }
}
