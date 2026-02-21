/**
 * Game Broadcast Helper
 * Notifies the RPG-JS game server of content changes
 * Use this after database operations for immediate effect
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Broadcast NPC creation to game server
 * Call this AFTER inserting to agent_configs
 */
export async function broadcastNPCCreated(npcData: any): Promise<void> {
  await supabase.channel('content_broadcast').send({
    type: 'broadcast',
    event: 'npc_created',
    payload: npcData
  });
}

/**
 * Broadcast NPC update to game server
 * Call this AFTER updating agent_configs
 */
export async function broadcastNPCUpdated(npcData: any): Promise<void> {
  await supabase.channel('content_broadcast').send({
    type: 'broadcast',
    event: 'npc_updated',
    payload: npcData
  });
}

/**
 * Broadcast NPC deletion to game server
 * Call this AFTER deleting from agent_configs
 */
export async function broadcastNPCDeleted(npcId: string): Promise<void> {
  await supabase.channel('content_broadcast').send({
    type: 'broadcast',
    event: 'npc_deleted',
    payload: { id: npcId }
  });
}

// ---------------------------------------------------------------------------
// Fragment decipher events
// ---------------------------------------------------------------------------

export interface FragmentDecipheredEvent {
  fragmentId: string;
  fragmentTitle: string;
  fragmentType: string;
  npcId: string;
  playerId: string;
  revealedCount: number;
  progress: { revealed: number; total: number; certainty: string };
  effects: {
    particleBurst: boolean;
    progressBar: { revealed: number; total: number };
    itemGlow: 'gold' | 'green';
  };
}

/**
 * Subscribe to fragment_deciphered events on the game_events channel.
 * Returns an unsubscribe function.
 */
export function onFragmentDeciphered(
  callback: (event: FragmentDecipheredEvent) => void,
): () => void {
  const channel = supabase
    .channel('game_events')
    .on('broadcast', { event: 'fragment_deciphered' }, (payload) => {
      callback(payload.payload as FragmentDecipheredEvent);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}