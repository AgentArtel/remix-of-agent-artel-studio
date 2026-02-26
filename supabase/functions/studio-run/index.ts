import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { workflow_id, workflow_graph } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Load workflow from DB if no graph provided
    let graph = workflow_graph
    if (!graph && workflow_id) {
      const { data } = await supabase
        .from('studio_workflows')
        .select('nodes_data, connections_data, name')
        .eq('id', workflow_id)
        .single()
      graph = data
    }

    if (!graph) {
      return new Response(
        JSON.stringify({ success: false, error: 'Workflow not found', mode: 'error' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if n8n webhook is configured for studio workflows
    const { data: webhook } = await supabase
      .from('n8n_webhook_registry')
      .select('webhook_url, timeout_ms')
      .eq('action_key', 'studio.run_workflow')
      .eq('is_active', true)
      .single()

    if (!webhook) {
      // Not configured yet — Studio falls back to local simulation (expected until n8n is wired)
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'N8N_NOT_CONFIGURED', message: 'n8n not connected. Using local simulation.' },
          mode: 'simulate',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Forward to n8n
    const n8nRes = await fetch(webhook.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow_id, graph, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(webhook.timeout_ms ?? 30000),
    })

    const result = await n8nRes.json()
    return new Response(
      JSON.stringify({ success: true, mode: 'n8n', result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
