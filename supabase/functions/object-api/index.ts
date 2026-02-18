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

// Helper to get email headers
function getHeader(headers: any[], name: string): string {
  const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
  return header?.value || ''
}

// Helper to decode base64 email body
function decodeBody(body: any): string {
  if (!body?.data) return ''
  try {
    return atob(body.data.replace(/-/g, '+').replace(/_/g, '/'))
  } catch {
    return ''
  }
}

// Mailbox handler
async function handleMailbox(supabase: any, action: string, playerId: string, inputs: any) {
  // Get user's Gmail credentials
  const { data: integration, error: credError } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', playerId)
    .eq('provider', 'google')
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

  // GET MAIL - Fetch emails with full content
  if (action === 'fetch_emails') {
    try {
      // 1. Get list of emails from inbox
      const listResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&labelIds=INBOX&q=is:unread',
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (listResponse.status === 401) {
        return {
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Gmail connection expired. Please reconnect in Integrations.',
            retryable: false
          }
        }
      }

      const listData = await listResponse.json()
      const messages = listData.messages || []

      if (messages.length === 0) {
        return {
          success: true,
          message: 'No new mail today.',
          inventory_delta: { add: [], remove: [] },
          emails: []
        }
      }

      // 2. Fetch full details for each email
      const emailDetails = []
      for (const msg of messages) {
        const detailResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: {
              'Authorization': `Bearer ${integration.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        )
        
        if (detailResponse.ok) {
          const detail = await detailResponse.json()
          const headers = detail.payload?.headers || []
          
          emailDetails.push({
            id: msg.id,
            threadId: msg.threadId,
            subject: getHeader(headers, 'Subject') || '(No Subject)',
            from: getHeader(headers, 'From'),
            date: getHeader(headers, 'Date'),
            snippet: detail.snippet || ''
          })
        }
      }

      // 3. Store emails in database for the player to access
      if (emailDetails.length > 0) {
        // Clear old unread emails first
        await supabase
          .from('workflow_context')
          .delete()
          .eq('player_id', playerId)
          .eq('data_type', 'unread_emails')

        // Store new emails
        await supabase.from('workflow_context').insert({
          player_id: playerId,
          data_type: 'unread_emails',
          payload: emailDetails
        })
      }

      return {
        success: true,
        message: `${emailDetails.length} letters collected`,
        inventory_delta: {
          add: emailDetails.length > 0 ? [{ type: 'email', count: emailDetails.length }] : [],
          remove: []
        }
        // Email data is stored in workflow_context for next object to process
      }

    } catch (error) {
      console.error('Fetch emails error:', error)
      return {
        success: false,
        error: {
          code: 'GMAIL_API_ERROR',
          message: 'Failed to fetch emails.',
          retryable: true
        }
      }
    }
  }

  // SEND MAIL - Compose and send a reply
  if (action === 'send_email') {
    const { to, subject, body, in_reply_to } = inputs || {}
    
    if (!to || !subject || !body) {
      return {
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Need recipient, subject, and message to send mail.',
          retryable: false
        }
      }
    }

    try {
      // Build the email content
      const emailLines = [
        'Content-Type: text/plain; charset="UTF-8"',
        'MIME-Version: 1.0',
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ]
      
      if (in_reply_to) {
        emailLines.splice(3, 0, `In-Reply-To: ${in_reply_to}`)
      }
      
      const emailContent = emailLines.join('\r\n')
      const encodedEmail = btoa(emailContent).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

      // Send via Gmail API
      const sendResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: encodedEmail })
        }
      )

      if (sendResponse.ok) {
        return {
          success: true,
          message: '✉️ Letter sent!',
          inventory_delta: { add: [], remove: [] }
        }
      } else {
        const errorData = await sendResponse.json()
        throw new Error(errorData.error?.message || 'Send failed')
      }

    } catch (error) {
      console.error('Send email error:', error)
      return {
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: 'Could not send the letter.',
          retryable: true
        }
      }
    }
  }

  // READ EMAIL - Get full content of a specific email
  if (action === 'read_email') {
    const { email_id } = inputs || {}
    
    if (!email_id) {
      return {
        success: false,
        error: { code: 'MISSING_EMAIL_ID', message: 'No email specified.', retryable: false }
      }
    }

    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${email_id}?format=full`,
        {
          headers: {
            'Authorization': `Bearer ${integration.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch email')
      }

      const data = await response.json()
      const headers = data.payload?.headers || []
      
      // Get body text
      let bodyText = ''
      if (data.payload?.parts) {
        const textPart = data.payload.parts.find((p: any) => p.mimeType === 'text/plain')
        if (textPart?.body?.data) {
          bodyText = decodeBody(textPart.body)
        }
      } else if (data.payload?.body?.data) {
        bodyText = decodeBody(data.payload.body)
      }

      return {
        success: true,
        message: 'Email loaded',
        email: {
          id: email_id,
          subject: getHeader(headers, 'Subject'),
          from: getHeader(headers, 'From'),
          date: getHeader(headers, 'Date'),
          body: bodyText.substring(0, 1000) // Limit length for game display
        }
      }

    } catch (error) {
      return {
        success: false,
        error: { code: 'READ_FAILED', message: 'Could not read the letter.', retryable: true }
      }
    }
  }

  return {
    success: false,
    error: { code: 'UNKNOWN_ACTION', message: `Unknown action: ${action}`, retryable: false }
  }
}

// Desk handler - processes mail from workflow_context
async function handleDesk(supabase: any, action: string, playerId: string, inputs: any) {
  
  // PROCESS MAIL - Read and transform mail data
  if (action === 'process_mail') {
    // 1. Get unread emails from workflow_context
    const { data: contextData, error: contextError } = await supabase
      .from('workflow_context')
      .select('*')
      .eq('player_id', playerId)
      .eq('data_type', 'unread_emails')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (contextError || !contextData) {
      return {
        success: true,
        message: 'No mail to process. Visit the mailbox first.',
        inventory_delta: { add: [], remove: [] }
      }
    }
    
    const emails = contextData.payload || []
    
    if (emails.length === 0) {
      return {
        success: true,
        message: 'No letters on your desk.',
        inventory_delta: { add: [], remove: [] }
      }
    }
    
    // 2. Process each email (transform data for AI agent)
    const processedLetters = emails.map((email: any) => ({
      id: email.id,
      from: email.from?.split('<')[0].trim() || 'Unknown',
      subject: email.subject || '(No Subject)',
      received: email.date,
      status: 'processed'
    }))
    
    // 3. Store processed data for AI agent
    await supabase.from('workflow_context').insert({
      player_id: playerId,
      data_type: 'processed_mail',
      payload: processedLetters,
      workflow_run_id: inputs?.workflow_run_id || null
    })
    
    // 4. Mark original as processed (remove from unread)
    await supabase
      .from('workflow_context')
      .delete()
      .eq('id', contextData.id)
    
    // 5. Return success - mail items consumed from inventory
    return {
      success: true,
      message: `Processed ${processedLetters.length} letters. Ready for agent review.`,
      inventory_delta: {
        add: [],
        remove: [{ type: 'email', count: emails.length }]
      },
      processed: processedLetters
    }
  }
  
  // CHECK STATUS - See what's on the desk
  if (action === 'check_desk') {
    const { data: unread } = await supabase
      .from('workflow_context')
      .select('*')
      .eq('player_id', playerId)
      .eq('data_type', 'unread_emails')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    const { data: processed } = await supabase
      .from('workflow_context')
      .select('*')
      .eq('player_id', playerId)
      .eq('data_type', 'processed_mail')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    const unreadCount = unread?.payload?.length || 0
    const processedCount = processed?.payload?.length || 0
    
    let message = 'Your desk is clear.'
    if (unreadCount > 0 && processedCount > 0) {
      message = `📬 ${unreadCount} new letters to process.\n📋 ${processedCount} ready for agent.`
    } else if (unreadCount > 0) {
      message = `📬 ${unreadCount} new letters waiting.`
    } else if (processedCount > 0) {
      message = `📋 ${processedCount} letters ready for agent.`
    }
    
    return {
      success: true,
      message,
      inventory_delta: { add: [], remove: [] },
      status: { unread: unreadCount, processed: processedCount }
    }
  }
  
  return {
    success: false,
    error: { code: 'UNKNOWN_ACTION', message: `Unknown desk action: ${action}`, retryable: false }
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
