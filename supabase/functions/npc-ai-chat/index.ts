/**
 * NPC AI Chat Edge Function
 * Handles AI conversations for NPCs in the RPG game.
 * Supports fragment delivery: when a player brings a fragment to an NPC,
 * the function checks if the NPC has the right skills to decipher it.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SB_URL = Deno.env.get('SUPABASE_URL')!
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function getSupabaseAdmin() {
  return createClient(SB_URL, SB_KEY)
}

// ── Fragment delivery logic ──────────────────────────────────────────

interface FragmentRouteResult {
  matched: boolean
  fragment?: any
  config?: { chunks_per_turn: number; narration_style: string; hint_text: string }
  hintText?: string
}

/**
 * Check if the NPC can process the given fragment based on its
 * fragment-analysis skill config_overrides.accepted_fragment_types.
 */
async function checkFragmentRoute(
  npcId: string,
  fragmentId: string
): Promise<FragmentRouteResult> {
  const sb = getSupabaseAdmin()

  // 1. Get the fragment
  const { data: fragment, error: fragErr } = await sb
    .from('fragment_archive')
    .select('*')
    .eq('id', fragmentId)
    .single()

  if (fragErr || !fragment) {
    console.error('[npc-ai-chat] Fragment not found:', fragmentId, fragErr)
    return { matched: false }
  }

  // 2. Find the PicoClaw agent linked to this NPC config
  const { data: pcAgent } = await sb
    .from('picoclaw_agents')
    .select('id')
    .eq('agent_config_id', npcId)
    .single()

  if (!pcAgent) {
    // NPC has no picoclaw agent — can't process fragments
    return { matched: false, fragment }
  }

  // 3. Check if this agent has fragment-analysis skill with matching types
  const { data: agentSkills } = await sb
    .from('picoclaw_agent_skills')
    .select('config_overrides, skill_id')
    .eq('agent_id', pcAgent.id)

  if (!agentSkills?.length) {
    return { matched: false, fragment }
  }

  // Find the fragment-analysis skill
  const { data: faSkill } = await sb
    .from('picoclaw_skills')
    .select('id')
    .eq('slug', 'fragment-analysis')
    .single()

  if (!faSkill) {
    return { matched: false, fragment }
  }

  const skillEntry = agentSkills.find((s: any) => s.skill_id === faSkill.id)
  if (!skillEntry) {
    return { matched: false, fragment }
  }

  const overrides = skillEntry.config_overrides as any || {}
  const acceptedTypes: string[] = overrides.accepted_fragment_types || []

  if (acceptedTypes.includes(fragment.fragment_type)) {
    return {
      matched: true,
      fragment,
      config: {
        chunks_per_turn: overrides.chunks_per_turn || 3,
        narration_style: overrides.narration_style || 'neutral',
        hint_text: overrides.hint_text || '',
      },
    }
  }

  // Not a match — find an NPC who CAN handle this type
  const hintText = overrides.hint_text || "I can't decipher this kind of fragment."
  return { matched: false, fragment, hintText }
}

/**
 * Call the decipher-fragment edge function to reveal chunks.
 */
async function callDecipherFragment(
  fragmentId: string,
  chunksToReveal: number
): Promise<{ success: boolean; revealedTexts: string[]; progress: any }> {
  const res = await fetch(`${SB_URL}/functions/v1/decipher-fragment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SB_KEY}`,
      apikey: SB_KEY,
    },
    body: JSON.stringify({ fragmentId, chunksToReveal }),
  })

  if (!res.ok) {
    const t = await res.text()
    console.error('[npc-ai-chat] decipher-fragment error:', t)
    return { success: false, revealedTexts: [], progress: null }
  }

  return res.json()
}

// ── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      npcId, playerId, playerName, message, config, history,
      fragmentId,  // NEW: optional fragment delivery
    } = await req.json()

    if (!npcId || !playerId || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: npcId, playerId, config' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // ── PicoClaw gateway routing ──
    const { data: pcAgent } = await supabaseAdmin
      .from('picoclaw_agents')
      .select('id, picoclaw_agent_id, deployment_status')
      .eq('agent_config_id', npcId)
      .single()

    if (pcAgent && pcAgent.deployment_status === 'running') {
      const PICOCLAW_GATEWAY_URL = Deno.env.get('PICOCLAW_GATEWAY_URL') || 'http://localhost:18790'
      const sessionKey = `${pcAgent.picoclaw_agent_id}:${npcId}_${playerId}`

      try {
        const pcRes = await fetch(`${PICOCLAW_GATEWAY_URL}/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message || 'Hello',
            session_key: sessionKey,
            channel: 'game',
            agent_id: pcAgent.picoclaw_agent_id,
          }),
          signal: AbortSignal.timeout(120_000),
        })

        if (pcRes.ok) {
          const pcData = await pcRes.json()
          const sessionId = `${npcId}_${playerId}`
          if (message) {
            await supabaseAdmin.from('agent_memory').insert({
              session_id: sessionId, npc_id: npcId,
              player_id: playerId, role: 'user', content: message,
              created_at: new Date().toISOString(),
            })
          }
          await supabaseAdmin.from('agent_memory').insert({
            session_id: sessionId, npc_id: npcId,
            player_id: playerId, role: 'assistant', content: pcData.response,
            created_at: new Date().toISOString(),
          })
          return new Response(
            JSON.stringify({ text: pcData.response, toolCalls: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } catch {
        console.warn('PicoClaw unreachable, falling back to standard LLM routing')
      }
    }

    // ── Fragment delivery check ──
    let fragmentContext = ''
    let fragmentResult: any = null

    if (fragmentId) {
      console.log(`[npc-ai-chat] Fragment delivery: ${fragmentId} → NPC ${npcId}`)
      const route = await checkFragmentRoute(npcId, fragmentId)

      if (route.matched && route.fragment && route.config) {
        // NPC can process this fragment — decipher it
        const decipherResult = await callDecipherFragment(
          fragmentId,
          route.config.chunks_per_turn
        )
        fragmentResult = {
          deciphered: true,
          progress: decipherResult.progress,
          fragmentTitle: route.fragment.title,
          fragmentType: route.fragment.fragment_type,
        }
        // ── Broadcast game_event for visual effects ──
        if (decipherResult.success && decipherResult.revealedTexts.length > 0) {
          try {
            const channel = supabaseAdmin.channel('game_events')
            await channel.send({
              type: 'broadcast',
              event: 'fragment_deciphered',
              payload: {
                fragmentId,
                fragmentTitle: route.fragment.title,
                fragmentType: route.fragment.fragment_type,
                npcId,
                playerId,
                revealedCount: decipherResult.revealedTexts.length,
                progress: decipherResult.progress,
                effects: {
                  particleBurst: true,
                  progressBar: {
                    revealed: decipherResult.progress?.revealed ?? 0,
                    total: decipherResult.progress?.total ?? 0,
                  },
                  itemGlow: decipherResult.progress?.certainty === 'confirmed' ? 'gold' : 'green',
                },
              },
            })
            await supabaseAdmin.removeChannel(channel)
          } catch (e) {
            console.warn('[npc-ai-chat] broadcast error (non-fatal):', e)
          }
        }

        if (decipherResult.revealedTexts.length > 0) {
          fragmentContext = `
[FRAGMENT DELIVERY — DECIPHER SUCCESS]
The player has brought you a ${route.fragment.fragment_type} fragment titled "${route.fragment.title}".
You have deciphered ${decipherResult.progress?.revealed || '?'} of ${decipherResult.progress?.total || '?'} parts (certainty: ${decipherResult.progress?.certainty || 'unknown'}).
Your narration style is ${route.config.narration_style}.

Newly revealed knowledge:
${decipherResult.revealedTexts.map((t: string, i: number) => `--- Fragment ${i + 1} ---\n${t}`).join('\n\n')}

Narrate what you've discovered from this fragment. Stay in character. Reference the certainty level — if partial, hint that more remains hidden.`
        } else {
          fragmentContext = `
[FRAGMENT DELIVERY — ALREADY COMPLETE]
The player has brought you "${route.fragment.title}" but you have already fully deciphered it.
Tell them you've already studied this artifact thoroughly and offer to discuss what you know about it.`
        }
      } else if (route.fragment) {
        // NPC cannot process this type
        fragmentResult = {
          deciphered: false,
          wrongNpc: true,
          fragmentTitle: route.fragment.title,
          fragmentType: route.fragment.fragment_type,
          hint: route.hintText,
        }
        fragmentContext = `
[FRAGMENT DELIVERY — WRONG SPECIALIST]
The player has brought you a ${route.fragment.fragment_type} fragment titled "${route.fragment.title}".
You cannot process this type of fragment. Stay in character and tell the player you can't decipher this.
Hint: ${route.hintText || "Suggest they find someone who specializes in this kind of artifact."}`
      }
    }

    // ── Build system prompt ──
    const { personality, model, skills } = config
    const modelName = model?.conversation || 'gpt-4o-mini'

    const systemPrompt = `${personality}

You are an NPC in an RPG game. Keep responses concise (1-3 sentences unless narrating a fragment discovery).
Respond in character. You can use the following skills: ${skills?.join(', ') || 'none'}.

Player name: ${playerName || 'Adventurer'}
NPC name: ${config.name}
${fragmentContext}`

    // ── Build messages ──
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      })),
      ...(message ? [{ role: 'user', content: message }] : [])
    ]

    // ── Call LLM ──
    let response
    if (modelName.includes('kimi')) {
      response = await callKimi(messages, modelName)
    } else if (modelName.includes('gemini')) {
      response = await callGemini(systemPrompt, messages, modelName)
    } else if (modelName.includes('groq') || modelName.includes('llama') || modelName.includes('mixtral')) {
      response = await callGroq(messages, modelName, skills)
    } else {
      response = await callOpenAI(messages, modelName, skills)
    }

    // ── Save to memory ──
    if (response.text && playerId) {
      const sessionId = `${npcId}_${playerId}`
      if (message) {
        await supabaseAdmin.from('agent_memory').insert({
          session_id: sessionId, npc_id: npcId,
          player_id: playerId, role: 'user', content: message,
          created_at: new Date().toISOString()
        })
      }
      await supabaseAdmin.from('agent_memory').insert({
        session_id: sessionId, npc_id: npcId,
        player_id: playerId, role: 'assistant', content: response.text,
        created_at: new Date().toISOString()
      })
    }

    const finalResponse = {
      ...response,
      ...(fragmentResult ? { fragmentResult } : {})
    };

    return new Response(
      JSON.stringify(finalResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Error in npc-ai-chat:', errMsg)
    return new Response(
      JSON.stringify({
        error: errMsg,
        text: "I'm sorry, I'm having trouble thinking right now."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ── LLM provider functions ───────────────────────────────────────────

async function callOpenAI(messages: any[], model: string, skills?: string[]) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const tools = skills?.filter(s => ['move', 'say', 'generate_image'].includes(s))
    .map(skill => getToolDefinition(skill))
    .filter(Boolean)

  const requestBody: any = {
    model: model || 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 300
  }

  if (tools && tools.length > 0) {
    requestBody.tools = tools
    requestBody.tool_choice = 'auto'
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  const choice = data.choices[0]

  return {
    text: choice.message.content || '',
    toolCalls: choice.message.tool_calls?.map((tc: any) => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    })),
    tokens: data.usage
  }
}

async function callKimi(messages: any[], model: string) {
  const apiKey = Deno.env.get('KIMI_API_KEY')
  if (!apiKey) throw new Error('KIMI_API_KEY not configured')

  const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'kimi-k2-0711-preview',
      messages,
      temperature: 0.7,
      max_tokens: 300
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Kimi API error: ${error}`)
  }

  const data = await response.json()
  return {
    text: data.choices[0].message.content,
    tokens: data.usage
  }
}

async function callGemini(systemPrompt: string, messages: any[], model: string) {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error: ${error}`)
  }

  const data = await response.json()
  const candidate = data.candidates?.[0]
  if (!candidate?.content?.parts?.[0]?.text) {
    console.error('Gemini response missing candidates:', JSON.stringify(data))
    throw new Error('Gemini returned empty response - possibly blocked by safety filters')
  }

  return { text: candidate.content.parts[0].text }
}

async function callGroq(messages: any[], model: string, skills?: string[]) {
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const requestBody: any = {
    model: model || 'llama-3.1-8b-instant',
    messages,
    temperature: 0.7,
    max_tokens: 300
  }

  const tools = skills?.filter(s => ['move', 'say', 'generate_image'].includes(s))
    .map(skill => getToolDefinition(skill))
    .filter(Boolean)

  if (tools && tools.length > 0) {
    requestBody.tools = tools
    requestBody.tool_choice = 'auto'
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Groq API error: ${error}`)
  }

  const data = await response.json()
  const choice = data.choices[0]

  return {
    text: choice.message.content || '',
    toolCalls: choice.message.tool_calls?.map((tc: any) => ({
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments)
    })),
    tokens: data.usage
  }
}

function getToolDefinition(toolName: string): any {
  const definitions: Record<string, any> = {
    move: {
      type: 'function',
      function: {
        name: 'move',
        description: 'Move in a direction',
        parameters: {
          type: 'object',
          properties: {
            direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
            distance: { type: 'number', description: 'Number of tiles' }
          },
          required: ['direction']
        }
      }
    },
    say: {
      type: 'function',
      function: {
        name: 'say',
        description: 'Say something to the player',
        parameters: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            emotion: { type: 'string', enum: ['happy', 'sad', 'angry', 'neutral'] }
          },
          required: ['message']
        }
      }
    },
    generate_image: {
      type: 'function',
      function: {
        name: 'generate_image',
        description: 'Generate an image',
        parameters: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'Image description' },
            style: { type: 'string', enum: ['realistic', 'fantasy', 'anime'] }
          },
          required: ['prompt']
        }
      }
    }
  }
  return definitions[toolName]
}
