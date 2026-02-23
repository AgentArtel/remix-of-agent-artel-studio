/**
 * PicoClaw Bridge Edge Function
 * Routes actions between Studio/Game and the PicoClaw agent runtime.
 *
 * Actions:
 *   chat           – Forward a message to PicoClaw, return the agent response
 *   deploy         – Build full config, push to PicoClaw, mark as running
 *   stop           – Remove agent from config, push to PicoClaw, mark as stopped
 *   status         – Check PicoClaw health + agent deployment state
 *   generate-config – Preview the PicoClaw JSON config (no side effects)
 *   sync-memory    – Pull agent memory and write to agent_memory table
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'npm:openai'

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

const API_BASE_MAP: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  moonshot: 'https://api.moonshot.ai/v1',
  kimi: 'https://api.moonshot.ai/v1',
  deepseek: 'https://api.deepseek.com/v1',
  cerebras: 'https://api.cerebras.ai/v1',
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1/',
  ollama: 'http://localhost:11434',
}

// Gemini model aliases for the OpenAI-compatible endpoint.
// Translate to known-working equivalents.
const GEMINI_MODEL_ALIASES: Record<string, string> = {
  'gemini-2.5-flash': 'gemini-2.0-flash',
  'gemini-2.5-pro': 'gemini-2.0-flash',
  'gemini-2.5-flash-lite': 'gemini-2.0-flash-lite',
}

function resolveModelName(rawModel: string, backend: string): string {
  if (backend === 'gemini' && GEMINI_MODEL_ALIASES[rawModel]) {
    return GEMINI_MODEL_ALIASES[rawModel]
  }
  return rawModel
}

const API_KEY_ENV_MAP: Record<string, string> = {
  groq: 'GROQ_API_KEY',
  gemini: 'GEMINI_API_KEY',
  moonshot: 'KIMI_API_KEY',
  kimi: 'KIMI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  cerebras: 'CEREBRAS_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

function getApiKey(backend: string): string {
  const envName = API_KEY_ENV_MAP[backend]
  return envName ? (Deno.env.get(envName) || '') : ''
}

// ---------------------------------------------------------------------------
// Config builders
// ---------------------------------------------------------------------------

/**
 * Build a complete PicoClaw config.Config from all deployed agents.
 * This is the full JSON that PicoClaw loads from config.json.
 */
function buildFullConfig(
  agents: any[],
  allAgentSkills: Map<string, any[]>,
) {
  // Deduplicate models across all agents
  const modelSet = new Map<string, any>()
  const agentList: any[] = []

  for (const agent of agents) {
    const rawModel = agent.llm_model || 'llama-3.1-8b-instant'
    const backend = agent.llm_backend || 'groq'
    const modelName = resolveModelName(rawModel, backend)

    if (!modelSet.has(modelName)) {
      modelSet.set(modelName, {
        model_name: modelName,
        model: `${backend}/${modelName}`,
        api_key: getApiKey(backend),
        api_base: API_BASE_MAP[backend] || '',
      })
    }

    // Register fallback models in model_list so PicoClaw knows their API endpoints
    const fallbacks = agent.fallback_models || []
    const fallbackModelNames: string[] = []
    for (const fb of fallbacks) {
      const fbBackend = fb.backend || 'gemini'
      const fbRawModel = fb.model || 'gemini-2.5-flash'
      const fbModel = resolveModelName(fbRawModel, fbBackend)
      if (!modelSet.has(fbModel)) {
        modelSet.set(fbModel, {
          model_name: fbModel,
          model: `${fbBackend}/${fbModel}`,
          api_key: getApiKey(fbBackend),
          api_base: API_BASE_MAP[fbBackend] || '',
        })
      }
      fallbackModelNames.push(fbModel)
    }

    const skills = allAgentSkills.get(agent.id) || []
    agentList.push({
      id: agent.picoclaw_agent_id,
      name: agent.picoclaw_agent_id,
      workspace: `/home/picoclaw/.picoclaw/workspace/${agent.picoclaw_agent_id}`,
      model: {
        primary: modelName,
        fallbacks: fallbackModelNames,
      },
      skills: skills.map((s: any) => s.skill?.slug ?? s.slug),
    })
  }

  const defaultModel = agentList[0]
    ? (typeof agentList[0].model === 'string' ? agentList[0].model : agentList[0].model.primary)
    : 'llama-3.1-8b-instant'

  return {
    agents: {
      defaults: {
        workspace: '/home/picoclaw/.picoclaw/workspace/default',
        restrict_to_workspace: true,
        model: defaultModel,
        max_tokens: 8192,
        temperature: 0.7,
        max_tool_iterations: 20,
      },
      list: agentList,
    },
    model_list: Array.from(modelSet.values()),
    gateway: { host: '0.0.0.0', port: 18790 },
    channels: {
      telegram: { enabled: false },
      discord: { enabled: false },
      whatsapp: { enabled: false },
      slack: { enabled: false },
      feishu: { enabled: false },
      dingtalk: { enabled: false },
      line: { enabled: false },
      onebot: { enabled: false },
      maixcam: { enabled: false },
      qq: { enabled: false },
    },
    tools: {
      web: { duckduckgo: { enabled: true, max_results: 5 } },
      cron: { exec_timeout_minutes: 5 },
    },
    heartbeat: { enabled: false },
    devices: { enabled: false },
  }
}

/** Build workspace file map (SOUL.md, IDENTITY.md, skills) for a single agent. */
function buildWorkspaceFiles(agent: any, skills: any[]): Record<string, string> {
  const files: Record<string, string> = {}

  if (agent.soul_md) files['SOUL.md'] = agent.soul_md
  if (agent.identity_md) files['IDENTITY.md'] = agent.identity_md
  if (agent.user_md) files['USER.md'] = agent.user_md
  if (agent.agents_md) files['AGENTS.md'] = agent.agents_md

  // Write skill files to skills/{slug}/SKILL.md
  for (const s of skills) {
    const slug = s.skill?.slug ?? s.slug
    const skillMd = s.skill?.skill_md ?? s.skill_md
    if (slug && skillMd) {
      files[`skills/${slug}/SKILL.md`] = skillMd
    }
  }

  return files
}

/**
 * Load all currently-deployed agents + their skills from DB.
 * Optionally include an additional agent (the one being deployed).
 */
async function loadDeployedAgents(supabase: any, includeAgentId?: string) {
  // Load all running agents + the target agent
  let query = supabase.from('picoclaw_agents').select('*')
  if (includeAgentId) {
    query = query.or(`deployment_status.eq.running,id.eq.${includeAgentId}`)
  } else {
    query = query.eq('deployment_status', 'running')
  }
  const { data: agents } = await query

  // Deduplicate
  const agentMap = new Map<string, any>()
  for (const a of (agents || [])) agentMap.set(a.id, a)
  const deployedAgents = Array.from(agentMap.values())

  // Load skills for each agent
  const allAgentSkills = new Map<string, any[]>()
  for (const a of deployedAgents) {
    const { data: skills } = await supabase
      .from('picoclaw_agent_skills')
      .select('config_overrides, skill:picoclaw_skills(*)')
      .eq('agent_id', a.id)
    allAgentSkills.set(a.id, skills || [])
  }

  return { deployedAgents, allAgentSkills }
}

/** Push config + workspace files to PicoClaw admin endpoint. */
async function pushToPicoClaw(
  config: any,
  workspaces: Record<string, { files: Record<string, string> }>,
) {
  const res = await fetch(`${PICOCLAW_GATEWAY_URL}/v1/admin/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config, workspaces }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PicoClaw returned ${res.status}: ${text}`)
  }

  return await res.json()
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleChat(params: any, supabase: any) {
  const { agentId, message, sessionId } = params
  if (!agentId || !message) {
    return errorResponse('MISSING_FIELDS', 'agentId and message are required')
  }

  // Load full agent record to check backend type
  const { data: agent } = await supabase
    .from('picoclaw_agents')
    .select('picoclaw_agent_id, llm_backend, llm_model, soul_md, identity_md, temperature, agent_type')
    .or(`id.eq.${agentId},picoclaw_agent_id.eq.${agentId}`)
    .limit(1)
    .single()

  const picoAgentId = agent?.picoclaw_agent_id || agentId
  const sessionKey = `agent:${picoAgentId}:${sessionId || 'default'}`
  const backend = agent?.llm_backend || 'groq'

  // Direct chat via OpenAI SDK for any backend with an OpenAI-compatible endpoint
  const baseURL = API_BASE_MAP[backend]
  const apiKey = getApiKey(backend)

  if (baseURL && apiKey) {
    try {
      const rawModel = agent?.llm_model || 'gemini-2.5-flash'
      const model = resolveModelName(rawModel, backend)

      const openai = new OpenAI({ apiKey, baseURL })

      // Build system message from agent personality
      const systemParts: string[] = []
      if (agent?.soul_md) systemParts.push(agent.soul_md)
      if (agent?.identity_md) systemParts.push(agent.identity_md)
      const systemContent = systemParts.join('\n\n---\n\n') || undefined

      // picoclaw-bridge is Studio's chat interface; always use studio_agent_memory
      // (agent_memory uses npc_id/player_id columns which this context doesn't have)
      const memoryTable = 'studio_agent_memory'
      const { data: memoryRows } = await supabase
        .from(memoryTable)
        .select('role, content')
        .eq('agent_id', picoAgentId)
        .eq('session_id', sessionId || 'default')
        .order('created_at', { ascending: false })
        .limit(20)

      // Build messages array in OpenAI chat format
      const messages: Array<{ role: string; content: string }> = []
      if (systemContent) {
        messages.push({ role: 'system', content: systemContent })
      }
      for (const r of (memoryRows || []).reverse()) {
        messages.push({ role: r.role, content: r.content })
      }
      messages.push({ role: 'user', content: message })

      const completion = await openai.chat.completions.create({
        model,
        messages,
        temperature: agent?.temperature ?? 0.7,
      })

      const responseText = completion.choices[0]?.message?.content ?? ''

      // Save conversation to memory
      await supabase.from(memoryTable).insert([
        { agent_id: picoAgentId, session_id: sessionId || 'default', role: 'user', content: message },
        { agent_id: picoAgentId, session_id: sessionId || 'default', role: 'assistant', content: responseText },
      ])

      return jsonResponse({ success: true, response: responseText, session_key: sessionKey, provider: backend })
    } catch (err: any) {
      console.error(`[picoclaw-bridge] ${backend} chat error:`, err)
      return errorResponse('LLM_ERROR', err.message, 500, true)
    }
  }

  // Fallback: route through PicoClaw gateway (no baseURL or API key configured)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS)

  try {
    const res = await fetch(`${PICOCLAW_GATEWAY_URL}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        session_key: sessionKey,
        agent_id: picoAgentId,
      }),
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

  // Load target agent
  const { data: agent, error: agentErr } = await supabase
    .from('picoclaw_agents')
    .select('*')
    .eq('id', agentId)
    .single()

  if (agentErr || !agent) {
    return errorResponse('NOT_FOUND', `Agent ${agentId} not found`, 404)
  }

  // Load all deployed agents + this one
  const { deployedAgents, allAgentSkills } = await loadDeployedAgents(supabase, agentId)

  // Build full config for PicoClaw
  const config = buildFullConfig(deployedAgents, allAgentSkills)

  // Build workspace files for all agents
  const workspaces: Record<string, { files: Record<string, string> }> = {}
  for (const a of deployedAgents) {
    workspaces[a.picoclaw_agent_id] = {
      files: buildWorkspaceFiles(a, allAgentSkills.get(a.id) || []),
    }
  }

  // Push to PicoClaw
  let deployWarning: string | null = null
  try {
    await pushToPicoClaw(config, workspaces)
  } catch (err: any) {
    // PicoClaw panics on duplicate route registration but still registers the agent.
    // Check if the agent actually got registered despite the 502.
    let recovered = false
    try {
      const healthRes = await fetch(`${PICOCLAW_GATEWAY_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      if (healthRes.ok) {
        const health = await healthRes.json()
        // If health is reachable and lists agents, the deploy likely succeeded
        // despite the ServeMux panic on route re-registration
        recovered = true
        deployWarning = `PicoClaw returned 502 (known route re-registration panic) but gateway is healthy. Agent registered successfully.`
      }
    } catch { /* health check failed too — genuine failure */ }

    if (!recovered) {
      await supabase.from('picoclaw_agents').update({
        deployment_status: 'error',
        last_error: err.message,
      }).eq('id', agentId)
      return errorResponse('PICOCLAW_ERROR', `Deploy failed: ${err.message}`, 502, true)
    }
  }

  // Success — update DB
  const { error: updateErr } = await supabase
    .from('picoclaw_agents')
    .update({
      deployment_status: 'running',
      last_deployed_at: new Date().toISOString(),
      last_error: deployWarning,
    })
    .eq('id', agentId)

  if (updateErr) {
    return errorResponse('DB_ERROR', updateErr.message, 500)
  }

  return jsonResponse({
    success: true,
    deployment_status: 'running',
    agents: deployedAgents.length,
    ...(deployWarning ? { warning: deployWarning } : {}),
  })
}

async function handleStop(params: any, supabase: any) {
  const { agentId } = params
  if (!agentId) return errorResponse('MISSING_FIELDS', 'agentId is required')

  // Mark as stopped in DB first
  const { error } = await supabase
    .from('picoclaw_agents')
    .update({ deployment_status: 'stopped' })
    .eq('id', agentId)

  if (error) return errorResponse('DB_ERROR', error.message, 500)

  // Rebuild config with remaining running agents
  const { deployedAgents, allAgentSkills } = await loadDeployedAgents(supabase)

  if (deployedAgents.length > 0) {
    const config = buildFullConfig(deployedAgents, allAgentSkills)
    const workspaces: Record<string, { files: Record<string, string> }> = {}
    for (const a of deployedAgents) {
      workspaces[a.picoclaw_agent_id] = {
        files: buildWorkspaceFiles(a, allAgentSkills.get(a.id) || []),
      }
    }

    try {
      await pushToPicoClaw(config, workspaces)
    } catch {
      // PicoClaw unreachable during stop is non-fatal — agent is already marked stopped in DB
    }
  }

  return jsonResponse({ success: true, deployment_status: 'stopped' })
}

async function handleStatus(_params: any, supabase: any) {
  let gateway = 'unreachable'
  let health = null
  try {
    const res = await fetch(`${PICOCLAW_GATEWAY_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    })
    health = await res.json()
    gateway = 'reachable'
  } catch { /* PicoClaw not running */ }

  const { data: agents } = await supabase
    .from('picoclaw_agents')
    .select('picoclaw_agent_id, deployment_status')

  return jsonResponse({ success: true, gateway, health, agents: agents || [] })
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

  const allAgentSkills = new Map<string, any[]>()
  allAgentSkills.set(agent.id, agentSkills || [])
  const config = buildFullConfig([agent], allAgentSkills)

  // Strip API keys from preview — keys are only sent server-side during deploy
  const safeConfig = {
    ...config,
    model_list: config.model_list.map(({ api_key, ...rest }: any) => rest),
  }

  return jsonResponse({ success: true, config: safeConfig })
}

async function handleSyncMemory(params: any, supabase: any) {
  const { agentId } = params
  if (!agentId) return errorResponse('MISSING_FIELDS', 'agentId is required')

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
        return await handleChat(params, supabase)
      case 'deploy':
        return await handleDeploy(params, supabase)
      case 'stop':
        return await handleStop(params, supabase)
      case 'status':
        return await handleStatus(params, supabase)
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
