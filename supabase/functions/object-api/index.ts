/**
 * Object API Edge Function
 * Handles workflow automation objects (Mailbox, Desk, etc.)
 * Uses stored user credentials from user_integrations
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
    const { object_type, action, player_id, inputs, workflow_run_id } = await req.json()

    if (!object_type || !action || !player_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Route to appropriate handler
    let result
    switch (object_type) {
      case 'mailbox':
        result = await handleMailbox(supabase, action, player_id, inputs)
        break
      case 'desk':
        result = await handleDesk(supabase, action, player_id, inputs)
        break
      case 'bulletin-board':
        result = await handleBulletinBoard(supabase, action, player_id, inputs)
        break
      default:
        throw new Error(`Unknown object type: ${object_type}`)
    }

    // Log to workflow_run if applicable
    if (workflow_run_id) {
      await logWorkflowStep(supabase, workflow_run_id, action, result)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Object API error:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error.message,
          retryable: false
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Mailbox handler
async function handleMailbox(supabase: any, action: string, playerId: string, inputs: any) {
  // Get user's Gmail credentials
  const { data: integration, error: credError } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', playerId)
    .eq('provider', 'gmail')
    .eq('is_active', true)
    .single()

  if (credError || !integration) {
    return {
      success: false,
      error: {
        code: 'CREDENTIALS_NOT_FOUND',
        message: 'Gmail not connected. Visit Integrations to connect.',
        retryable: false
      }
    }
  }

  if (action === 'fetch_emails') {
    try {
      // Call Gmail API
      const response = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&labelIds=INBOX',
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.status === 401) {
        // Token expired
        return {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Gmail connection expired. Please reconnect in Integrations.',
            retryable: false
          }
        }
      }

      const data = await response.json()
      const emails = data.messages || []

      // Store email data in workflow_context
      if (emails.length > 0) {
        await supabase.from('workflow_context').insert({
          player_id: playerId,
          data_type: 'emails',
          payload: emails.map((e: any) => ({
            id: e.id,
            threadId: e.threadId
          }))
        })
      }

      return {
        success: true,
        message: `Found ${emails.length} new emails!`,
        inventory_delta: {
          add: emails.length > 0 ? [{ type: 'email', count: emails.length }] : [],
          remove: []
        },
        step_record: {
          action: 'fetch_emails',
          params: { max_results: 10 },
          duration_ms: 0
        }
      }

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GMAIL_API_ERROR',
          message: 'Failed to fetch emails from Gmail.',
          retryable: true
        }
      }
    }
  }

  return {
    success: false,
    error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}`, retryable: false }
  }
}

// Desk handler (placeholder)
async function handleDesk(supabase: any, action: string, playerId: string, inputs: any) {
  return {
    success: true,
    message: 'Desk is under construction.',
    inventory_delta: { add: [], remove: [] }
  }
}

// Bulletin Board handler (placeholder)
async function handleBulletinBoard(supabase: any, action: string, playerId: string, inputs: any) {
  return {
    success: true,
    message: 'Bulletin Board is under construction.',
    inventory_delta: { add: [], remove: [] }
  }
}

// Log workflow step
async function logWorkflowStep(supabase: any, runId: string, action: string, result: any) {
  await supabase
    .from('workflow_runs')
    .update({
      logs: supabase.sql`array_append(logs, ${JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        success: result.success
      })})`
    })
    .eq('id', runId)
}
