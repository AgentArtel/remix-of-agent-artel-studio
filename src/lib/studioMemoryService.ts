import { supabase } from '@/integrations/supabase/client';

export interface MemoryMessage {
  role: string;
  content: string;
}

/**
 * Load the last N messages for a studio agent session from studio_agent_memory.
 */
export async function loadStudioMemory(
  agentId: string,
  sessionId: string,
  windowSize: number = 50
): Promise<MemoryMessage[]> {
  const { data, error } = await supabase
    .from('studio_agent_memory')
    .select('role, content')
    .eq('agent_id', agentId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(windowSize);

  if (error) {
    console.error('[StudioMemory] Failed to load:', error);
    return [];
  }

  return (data || []).reverse().map((row: any) => ({
    role: row.role,
    content: row.content,
  }));
}

/**
 * Save messages to studio_agent_memory.
 */
export async function saveStudioMemory(
  agentId: string,
  sessionId: string,
  messages: MemoryMessage[]
): Promise<void> {
  const rows = messages.map((msg) => ({
    agent_id: agentId,
    session_id: sessionId,
    role: msg.role,
    content: msg.content,
  }));

  const { error } = await supabase
    .from('studio_agent_memory')
    .insert(rows);

  if (error) {
    console.error('[StudioMemory] Failed to save:', error);
  }
}
