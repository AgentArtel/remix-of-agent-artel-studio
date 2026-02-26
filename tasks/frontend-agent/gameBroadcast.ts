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
