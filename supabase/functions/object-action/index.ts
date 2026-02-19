/**
 * Object Action Edge Function
 * Proxy between game objects and n8n workflows.
 * Looks up the n8n webhook URL for the given action_key and forwards the request.
 * Returns { code: 'NO_WORKFLOW' } when n8n is not yet configured for an action.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { object_type, action, player_id, inputs, workflow_run_id } = body

    if (!object_type || !action || !player_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_FIELDS',
            message: 'object_type, action, and player_id are required',
            retryable: false,
          },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Look up the n8n webhook for this action
    const actionKey = `${object_type}.${action}`
    const { data: webhook, error: webhookError } = await supabase
      .from('n8n_webhook_registry')
      .select('webhook_url, response_mode, timeout_ms, is_active')
      .eq('action_key', actionKey)
      .single()

    if (webhookError || !webhook || !webhook.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NO_WORKFLOW',
            message: `No active n8n workflow registered for "${actionKey}". Configure via n8n_webhook_registry.`,
            retryable: false,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build payload for n8n
    const n8nPayload = {
      object_type,
      action,
      player_id,
      inputs: inputs || {},
      workflow_run_id: workflow_run_id || null,
      timestamp: new Date().toISOString(),
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), webhook.timeout_ms ?? 30000)

    let n8nResult: any
    try {
      const n8nRes = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!n8nRes.ok) {
        throw new Error(`n8n returned ${n8nRes.status}: ${await n8nRes.text()}`)
      }
      n8nResult = await n8nRes.json()
    } catch (fetchErr: any) {
      clearTimeout(timeoutId)
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'N8N_UNREACHABLE',
            message: fetchErr.message,
            retryable: true,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Pass n8n result back to game server
    return new Response(
      JSON.stringify(n8nResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message, retryable: false },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
