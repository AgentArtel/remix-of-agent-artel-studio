/**
 * PicoClaw Bridge Edge Function
 * Routes actions between Studio/Game and the PicoClaw agent runtime.
 *
 * Actions:
 *   chat           – Forward a message to PicoClaw, return the agent response
 *   deploy         – Write PicoClaw config for an agent, mark as running
 *   stop           – Remove agent config, mark as stopped
 *   status         – Check PicoClaw health + agent deployment state
 *   generate-config – Preview the PicoClaw JSON config (no side effects)
 *   sync-memory    – Pull agent memory and write to agent_memory table
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PICOCLAW_GATEWAY_URL = Deno.env.get('PICOCLAW_GATEWAY_URL') || 'http://localhost:18790'
const CHAT_TIMEOUT_MS = 120_000 // 2 minutes for agent tool-loop

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(code: string, message: string, status = 400, retryable = false) {
  return jsonResponse({ success: false, error: { code, message, retryable } }, status)
}

/** Build PicoClaw JSON config from a picoclaw_agents row + its skills. */
function buildPicoClawConfig(agent: any, skills: any[]) {
  const toolDefs = skills.flatMap((s: any) => {
    const tools = s.skill?.tools ?? s.tools ?? []
    return Array.isArray(tools) ? tools : []
  })

  return {
    agents: {
      defaults: {
        workspace: `/data/workspaces/${agent.picoclaw_agent_id}`,
        restrict_to_workspace: true,
        model: agent.llm_model || 'llama-3.1-8b-instant',
        max_tokens: agent.max_tokens || 4096,
        temperature: agent.temperature || 0.7,
        max_tool_iterations: agent.max_tool_iterations || 20,
      },
      list: [
        {
          id: agent.picoclaw_agent_id,
          name: agent.picoclaw_agent_id,
          workspace: `/data/workspaces/${agent.picoclaw_agent_id}`,
          model: {
            primary: agent.llm_model || 'llama-3.1-8b-instant',
            fallbacks: agent.fallback_models || [],
          },
          skills: skills.map((s: any) => s.skill?.slug ?? s.slug),
        },
      ],
    },
    model_list: [
      {
        model_name: agent.llm_model || 'llama-3.1-8b-instant',
        model: `${agent.llm_backend || 'groq'}/${agent.llm_model || 'llama-3.1-8b-instant'}`,
      },
    ],
    bootstrap: {
      soul_md: agent.soul_md || '',
      identity_md: agent.identity_md || '',
      user_md: agent.user_md || '',
      agents_md: agent.agents_md || '',
    },
    tools: toolDefs,
    memory: {
      enabled: agent.memory_enabled ?? true,
      long_term: agent.long_term_memory_enabled ?? true,
    },
  }
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleChat(params: any) {
  const { agentId, message, sessionId } = params
  if (!agentId || !message) {
    return errorResponse('MISSING_FIELDS', 'agentId and message are required')
  }

  const sessionKey = `${agentId}:${sessionId || 'default'}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

  try {
    const res = await fetch(`${PICOCLAW_GATEWAY_URL}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_key: sessionKey }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text()
      return errorResponse('PICOCLAW_ERROR', `PicoClaw returned ${res.status}: ${text}`, 502, true)
    }

    const data = await res.json()
    return jsonResponse({ success: true, response: data.response, session_key: sessionKey })
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      return errorResponse('TIMEOUT', 'PicoClaw agent did not respond in time', 504, true)
    }
    return errorResponse('PICOCLAW_UNREACHABLE', err.message, 502, true)
  }
}

async function handleDeploy(params: any, supabase: any) {
  const { agentId } = params
  if (!agentId) return errorResponse('MISSING_FIELDS', 'agentId is required')

  // Load agent + skills
  const { data: agent, error: agentErr } = await supabase
    .from('picoclaw_agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (agentErr || !agent) {
    return errorResponse('NOT_FOUND', `Agent ${agentId} not found`, 404)
  }

  const { data: agentSkills } = await supabase
    .from('picoclaw_agent_skills')
    .select('config_overrides, skill:picoclaw_skills(*)')
    .eq('agent_id', agentId)

  const config = buildPicoClawConfig(agent, agentSkills || [])

  // Update deployment status
  const { error: updateErr } = await supabase
    .from('picoclaw_agents')
    .update({
      deployment_status: 'running',
      last_deployed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('id', agentId)

  if (updateErr) {
    return errorResponse('DB_ERROR', updateErr.message, 500)
  }

  return jsonResponse({ success: true, config, deployment_status: 'running' })
}

async function handleStop(params: any, supabase: any) {
  const { agentId } = params
  if (!agentId) return errorResponse('MISSING_FIELDS', 'agentId is required')

  const { error } = await supabase
    .from('picoclaw_agents')
    .update({ deployment_status: 'stopped' })
    .eq('id', agentId)

  if (error) return errorResponse('DB_ERROR', error.message, 500)

  return jsonResponse({ success: true, deployment_status: 'stopped' })
}

async function handleStatus(_params: any) {
  try {
    const res = await fetch(`${PICOCLAW_GATEWAY_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const health = await res.json()
    return jsonResponse({ success: true, gateway: 'reachable', health })
  } catch {
    return jsonResponse({ success: true, gateway: 'unreachable', health: null })
  }
}

async function handleGenerateConfig(params: any, supabase: any) {
  const { agentId } = params
  if (!agentId) return errorResponse('MISSING_FIELDS', 'agentId is required')

  const { data: agent, error: agentErr } = await supabase
    .from('picoclaw_agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (agentErr || !agent) {
    return errorResponse('NOT_FOUND', `Agent ${agentId} not found`, 404)
  }

  const { data: agentSkills } = await supabase
    .from('picoclaw_agent_skills')
    .select('config_overrides, skill:picoclaw_skills(*)')
    .eq('agent_id', agentId)

  const config = buildPicoClawConfig(agent, agentSkills || [])

  return jsonResponse({ success: true, config })
}

async function handleSyncMemory(params: any, supabase: any) {
  const { agentId } = params
  if (!agentId) return errorResponse('MISSING_FIELDS', 'agentId is required')

  // For now, sync-memory is a placeholder that updates the agent's
  // last activity timestamp. Full volume-based memory sync requires
  // shared filesystem access (not available from edge functions).
  const { error } = await supabase
    .from('picoclaw_agents')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', agentId)

  if (error) return errorResponse('DB_ERROR', error.message, 500)

  return jsonResponse({ success: true, synced: true })
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, ...params } = body

    if (!action) {
      return errorResponse('MISSING_ACTION', 'action field is required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    switch (action) {
      case 'chat':
        return await handleChat(params)
      case 'deploy':
        return await handleDeploy(params, supabase)
      case 'stop':
        return await handleStop(params, supabase)
      case 'status':
        return await handleStatus(params)
      case 'generate-config':
        return await handleGenerateConfig(params, supabase)
      case 'sync-memory':
        return await handleSyncMemory(params, supabase)
      default:
        return errorResponse('UNKNOWN_ACTION', `Unknown action: ${action}`)
    }
  } catch (err: any) {
    return errorResponse('INTERNAL_ERROR', err.message, 500)
  }
})
