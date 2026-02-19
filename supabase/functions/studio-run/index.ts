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

    // n8n_webhook_registry table does not exist yet.
    // Return simulate mode so Studio falls back to local execution.
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'N8N_NOT_CONFIGURED', message: 'n8n not connected. Using local simulation.' },
        mode: 'simulate',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
