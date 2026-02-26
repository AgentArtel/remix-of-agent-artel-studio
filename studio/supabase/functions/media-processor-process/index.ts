/**
 * Media Processor — Process File
 * Takes an entry_id, calls extract-lore-text Edge Function to convert the file to markdown.
 * extract-lore-text handles: fetching from storage, extraction (PicoClaw/Gemini), writing content.
 *
 * Called via object-action proxy: action_key = "media-processor.process"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// extract-lore-text can be slow for large binary files (PDF, DOCX via PicoClaw/Gemini)
const EXTRACT_TIMEOUT_MS = 120_000

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
        JSON.stringify({ success: false, message: 'No file to process. Take a task from the Task Board first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[media-processor-process] Player ${player_id} processing entry ${entry_id}`)

    // Call extract-lore-text Edge Function (same Supabase project)
    // The modified extract-lore-text will: fetch file from storage, extract text, save to content column
    let extractResult: any
    try {
      const extractRes = await fetch(
        `${SB_URL}/functions/v1/extract-lore-text`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SB_KEY}`,
          },
          body: JSON.stringify({ entryId: entry_id }),
          signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
        }
      )

      if (!extractRes.ok) {
        const errText = await extractRes.text()
        console.error(`[media-processor-process] extract-lore-text returned ${extractRes.status}:`, errText)
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Could not process this file.',
            error: { code: 'EXTRACT_FAILED', message: `Extraction returned ${extractRes.status}`, retryable: true },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      extractResult = await extractRes.json()
    } catch (fetchErr: any) {
      console.error('[media-processor-process] extract-lore-text unreachable:', fetchErr)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Processing service timed out. Try again.',
          error: { code: 'EXTRACT_TIMEOUT', message: fetchErr.message, retryable: true },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check extraction result
    if (!extractResult.success || !extractResult.contentLength || extractResult.contentLength === 0) {
      console.error('[media-processor-process] Extraction returned no content:', extractResult)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Could not extract text from this file.',
          error: { code: 'EXTRACT_EMPTY', message: 'No content extracted', retryable: true },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[media-processor-process] Entry ${entry_id} processed, ${extractResult.contentLength} chars extracted`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File processed! Return to the Task Board to collect your reward.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[media-processor-process] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message, retryable: false } }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
