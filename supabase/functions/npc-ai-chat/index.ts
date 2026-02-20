/**
 * NPC AI Chat Edge Function
 * Handles AI conversations for NPCs in the RPG game
 * Keeps API keys secure on the server side
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { npcId, playerId, playerName, message, config, history } = await req.json()

    if (!npcId || !playerId || !config) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: npcId, playerId, config' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- PicoClaw routing ---
    // Check if this NPC has a deployed PicoClaw agent
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
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
          }),
          signal: AbortSignal.timeout(120_000),
        })

        if (pcRes.ok) {
          const pcData = await pcRes.json()
          const sessionId = `${npcId}_${playerId}`

          // Save to memory (same pattern as existing code)
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
        // If PicoClaw unreachable, fall through to existing LLM routing
      } catch {
        // PicoClaw timeout or network error — fall through to existing routing
        console.warn('PicoClaw unreachable, falling back to standard LLM routing')
      }
    }
    // --- End PicoClaw routing ---

    // Get AI configuration
    const { personality, model, skills } = config
    const modelName = model?.conversation || 'gpt-4o-mini'

    // Build system prompt
    const systemPrompt = `${personality}

You are an NPC in an RPG game. Keep responses concise (1-3 sentences).
Respond in character. You can use the following skills: ${skills?.join(', ') || 'none'}.

Player name: ${playerName || 'Adventurer'}
NPC name: ${config.name}`

    // Build messages
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      })),
      ...(message ? [{ role: 'user', content: message }] : [])
    ]

    // Call appropriate AI API based on model
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

    // Save to memory if successful
    if (response.text && playerId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      const sessionId = `${npcId}_${playerId}`
      
      // Save user message
      if (message) {
        await supabase.from('agent_memory').insert({
          session_id: sessionId,
          npc_id: npcId,
          player_id: playerId,
          role: 'user',
          content: message,
          created_at: new Date().toISOString()
        })
      }

      // Save AI response
      await supabase.from('agent_memory').insert({
        session_id: sessionId,
        npc_id: npcId,
        player_id: playerId,
        role: 'assistant',
        content: response.text,
        created_at: new Date().toISOString()
      })
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in npc-ai-chat:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        text: "I'm sorry, I'm having trouble thinking right now."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function callOpenAI(messages: any[], model: string, skills?: string[]) {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  // Build tool definitions if skills provided
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

  // Use international API endpoint for USA-based users
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

  return {
    text: data.candidates[0].content.parts[0].text
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


async function callGroq(messages: any[], model: string, skills?: string[]) {
  const apiKey = Deno.env.get('GROQ_API_KEY')
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  // Groq uses OpenAI-compatible format
  const requestBody: any = {
    model: model || 'llama-3.1-8b-instant',
    messages,
    temperature: 0.7,
    max_tokens: 300
  }

  // Add tools if skills provided
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
