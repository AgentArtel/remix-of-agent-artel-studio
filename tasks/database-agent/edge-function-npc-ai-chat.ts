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

  } catch (error) {
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

  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
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
