/**
 * Task Board — Assign Task
 * Picks one unprocessed world_lore_entries row and assigns it to the player.
 * Returns inventory_delta (add task-fragment) and variables (entry_id).
 *
 * Called via object-action proxy: action_key = "task-board.assign_task"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { player_id } = body

    if (!player_id) {
      return new Response(
        JSON.stringify({ success: false, error: { code: 'MISSING_FIELDS', message: 'player_id is required', retryable: false } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SB_URL, SB_KEY)

    // Find one unprocessed lore entry (has a file in storage but no extracted content)
    const { data: entry, error: queryError } = await supabase
      .from('world_lore_entries')
      .select('id, title, file_name')
      .is('content', null)
      .not('storage_path', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (queryError) {
      console.error('[task-board-assign] Query error:', queryError)
      return new Response(
        JSON.stringify({ success: false, error: { code: 'QUERY_ERROR', message: queryError.message, retryable: true } }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!entry) {
      return new Response(
        JSON.stringify({ success: false, message: 'No unprocessed files available.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const label = entry.title || entry.file_name || 'unknown file'
    console.log(`[task-board-assign] Assigning entry ${entry.id} (${label}) to player ${player_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Task assigned: ${label}. Take it to the Media Processor.`,
        inventory_delta: {
          add: [{ type: 'task-fragment', count: 1 }],
        },
        variables: {
          entry_id: entry.id,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[task-board-assign] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message, retryable: false } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
