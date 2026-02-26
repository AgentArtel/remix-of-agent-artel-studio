import { supabase } from '@/integrations/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KimiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_call_id?: string;
  name?: string;
}

export interface KimiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface KimiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedTokens: number;
}

export interface KimiChatResponse {
  success: boolean;
  text?: string;
  finishReason?: string;
  toolCalls?: KimiToolCall[];
  thinking?: string;
  usage?: KimiUsage;
  error?: string;
  message?: string;
}

export interface KimiModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface BaseChatParams {
  messages: KimiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
  toolChoice?: string | object;
  responseFormat?: { type: string };
  promptCacheKey?: string;
  topP?: number;
  n?: number;
  stop?: string | string[];
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// ─── Non-streaming helpers ───────────────────────────────────────────────────

async function invokeKimi(body: Record<string, unknown>): Promise<KimiChatResponse> {
  const { data, error } = await supabase.functions.invoke('kimi-chat', { body });
  if (error) throw error;
  return data as KimiChatResponse;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Standard chat completion (non-streaming) */
export async function kimiChat(params: BaseChatParams): Promise<KimiChatResponse> {
  return invokeKimi({ action: 'chat', ...params });
}

/** Streaming chat – returns a ReadableStream of SSE chunks */
export async function kimiChatStream(params: BaseChatParams): Promise<ReadableStream<Uint8Array>> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kimi-chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action: 'chat', stream: true, ...params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `Kimi stream error ${res.status}`);
  }
  return res.body!;
}

/** Vision / multimodal chat – send images/video alongside text */
export async function kimiVision(params: BaseChatParams): Promise<KimiChatResponse> {
  return invokeKimi({ action: 'vision', ...params });
}

/** Chat with built-in web search enabled */
export async function kimiWebSearch(params: BaseChatParams): Promise<KimiChatResponse> {
  return invokeKimi({ action: 'web-search', ...params });
}

/** Chat with thinking / chain-of-thought mode */
export async function kimiThinking(
  params: BaseChatParams & { thinking?: { type: 'enabled' | 'disabled'; budget_tokens?: number } },
): Promise<KimiChatResponse> {
  return invokeKimi({ action: 'thinking', ...params });
}

/** List available Kimi models */
export async function kimiListModels(): Promise<{ success: boolean; models?: KimiModel[]; error?: string }> {
  const { data, error } = await supabase.functions.invoke('kimi-chat', {
    body: { action: 'list-models' },
  });
  if (error) throw error;
  return data as { success: boolean; models?: KimiModel[]; error?: string };
}
