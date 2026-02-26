/**
 * Task Board — Turn In Task
 * Verifies that the assigned world_lore_entries row has been processed (content IS NOT NULL).
 * If processed: rewards gold, removes task-fragment, clears entry_id variable.
 * If not processed: tells the player to process it first.
 *
 * Called via object-action proxy: action_key = "task-board.turn_in_task"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const REWARD_GOLD = 50

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { player_id, inputs } = body
    const entry_id = inputs?.entry_id

    if (!player_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_FIELDS', message: 'player_id is required', retryable: false } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!entry_id) {
      return new Response(
        JSON.stringify({ success: false, message: 'You don\'t have an active task to turn in.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SB_URL, SB_KEY)

    // Check if the entry has been processed
    const { data: entry, error: queryError } = await supabase
      .from('world_lore_entries')
      .select('id, content, title, file_name')
      .eq('id', entry_id)
      .single()

    if (queryError || !entry) {
      console.error('[task-board-turnin] Entry not found:', entry_id, queryError)
      return new Response(
        JSON.stringify({ success: false, message: 'Task entry not found. It may have been removed.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Not processed yet
    if (!entry.content) {
      return new Response(
        JSON.stringify({ success: false, message: 'This file hasn\'t been processed yet. Take it to the Media Processor first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Processed — reward the player
    const label = entry.title || entry.file_name || 'file'
    console.log(`[task-board-turnin] Player ${player_id} turning in entry ${entry_id} (${label}), reward: ${REWARD_GOLD} gold`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Task complete! "${label}" processed. +${REWARD_GOLD} gold.`,
        reward_gold: REWARD_GOLD,
        inventory_delta: {
          remove: [{ type: 'task-fragment', count: 1 }],
        },
        variables: {
          entry_id: null,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[task-board-turnin] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message, retryable: false } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
