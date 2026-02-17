const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const MOONSHOT_BASE = 'https://api.moonshot.ai/v1'

type Action = 'chat' | 'vision' | 'web-search' | 'thinking' | 'list-models'

interface KimiRequest {
  action: Action
  messages?: Array<{ role: string; content: unknown }>
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  tools?: unknown[]
  toolChoice?: string | object
  responseFormat?: object
  thinking?: { type: 'enabled' | 'disabled'; budget_tokens?: number }
  promptCacheKey?: string
  topP?: number
  n?: number
  stop?: string | string[]
  frequencyPenalty?: number
  presencePenalty?: number
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function getDefaultModel(action: Action): string {
  switch (action) {
    case 'vision':
      return 'kimi-k2.5'
    case 'thinking':
      return 'kimi-k2-thinking-turbo'
    case 'web-search':
      return 'kimi-k2.5'
    default:
      return 'kimi-k2.5'
  }
}

async function handleListModels(apiKey: string): Promise<Response> {
  const res = await fetch(`${MOONSHOT_BASE}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const data = await res.json()
  if (!res.ok) {
    return jsonResponse({ success: false, error: 'api_error', message: data?.error?.message ?? 'Failed to list models' }, res.status)
  }
  return jsonResponse({ success: true, models: data.data })
}

async function handleChat(body: KimiRequest, apiKey: string): Promise<Response> {
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return jsonResponse({ success: false, error: 'invalid_request', message: 'messages array is required' }, 400)
  }

  const model = body.model || getDefaultModel(body.action)

  // Build the OpenAI-compatible request body
  const payload: Record<string, unknown> = {
    model,
    messages: body.messages,
  }

  if (body.temperature !== undefined) payload.temperature = body.temperature
  if (body.maxTokens !== undefined) payload.max_tokens = body.maxTokens
  if (body.topP !== undefined) payload.top_p = body.topP
  if (body.n !== undefined) payload.n = body.n
  if (body.stop !== undefined) payload.stop = body.stop
  if (body.frequencyPenalty !== undefined) payload.frequency_penalty = body.frequencyPenalty
  if (body.presencePenalty !== undefined) payload.presence_penalty = body.presencePenalty
  if (body.stream) payload.stream = true
  if (body.responseFormat) payload.response_format = body.responseFormat
  if (body.promptCacheKey) payload.prompt_cache_key = body.promptCacheKey

  // Tool calling passthrough
  if (body.tools && body.tools.length > 0) {
    payload.tools = body.tools
    if (body.toolChoice) payload.tool_choice = body.toolChoice
  }

  // Web search: inject the built-in $web_search tool
  if (body.action === 'web-search') {
    const webSearchTool = {
      type: 'builtin_function',
      function: { name: '$web_search' },
    }
    const existing = Array.isArray(payload.tools) ? payload.tools : []
    payload.tools = [webSearchTool, ...existing]
  }

  // Thinking mode
  if (body.action === 'thinking' || body.thinking) {
    payload.thinking = body.thinking ?? { type: 'enabled' }
  }

  const res = await fetch(`${MOONSHOT_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  // Streaming: pass through SSE body directly
  if (body.stream && res.ok && res.body) {
    return new Response(res.body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  const data = await res.json()

  if (!res.ok) {
    const errMsg = data?.error?.message ?? 'API call failed'
    const errType = data?.error?.type ?? 'api_error'
    console.error(`[kimi-chat] Error ${res.status}:`, errMsg)

    if (res.status === 429) {
      return jsonResponse({ success: false, error: 'rate_limit', message: errMsg }, 429)
    }
    if (res.status === 401) {
      return jsonResponse({ success: false, error: 'auth_error', message: 'Invalid API key' }, 401)
    }
    if (errType === 'content_filter' || errMsg.includes('safety') || errMsg.includes('blocked')) {
      return jsonResponse({ success: false, error: 'content_policy', message: errMsg })
    }
    return jsonResponse({ success: false, error: 'api_error', message: errMsg }, res.status)
  }

  const choice = data.choices?.[0]
  const result: Record<string, unknown> = {
    success: true,
    text: choice?.message?.content ?? '',
    finishReason: choice?.finish_reason,
  }

  // Include tool calls if present
  if (choice?.message?.tool_calls) {
    result.toolCalls = choice.message.tool_calls
  }

  // Include thinking content if present
  if (choice?.message?.reasoning_content) {
    result.thinking = choice.message.reasoning_content
  }

  // Usage
  if (data.usage) {
    result.usage = {
      promptTokens: data.usage.prompt_tokens ?? 0,
      completionTokens: data.usage.completion_tokens ?? 0,
      totalTokens: data.usage.total_tokens ?? 0,
      cachedTokens: data.usage.prompt_cache_hit_tokens ?? 0,
    }
  }

  return jsonResponse(result)
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'method_not_allowed' }, 405)
  }

  const apiKey = Deno.env.get('MOONSHOT_API_KEY')
  if (!apiKey) {
    console.error('[kimi-chat] MOONSHOT_API_KEY not set')
    return jsonResponse({ success: false, error: 'api_unavailable', message: 'MOONSHOT_API_KEY not configured' }, 503)
  }

  try {
    const body = (await req.json()) as KimiRequest

    if (!body.action) {
      return jsonResponse({ success: false, error: 'invalid_request', message: 'action is required' }, 400)
    }

    switch (body.action) {
      case 'list-models':
        return await handleListModels(apiKey)
      case 'chat':
      case 'vision':
      case 'web-search':
      case 'thinking':
        return await handleChat(body, apiKey)
      default:
        return jsonResponse({ success: false, error: 'invalid_request', message: `Unknown action: ${body.action}` }, 400)
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[kimi-chat] Unhandled error:', errorMessage)
    return jsonResponse({ success: false, error: 'internal_error', message: 'An unexpected error occurred' }, 500)
  }
})
