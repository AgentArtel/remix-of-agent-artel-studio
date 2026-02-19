import type { NodeType } from '@/types';

export type ConfigFieldType =
  | 'text'
  | 'textarea'
  | 'password'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'json'
  | 'code'
  | 'credentials'
  | 'resource'
  | 'color'
  | 'date'
  | 'datetime';

export interface ValidationRules {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: unknown) => string | undefined;
}

export interface SelectOption {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface ConfigField {
  id: string;
  type: ConfigFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  required?: boolean;
  disabled?: boolean;
  validation?: ValidationRules;
  options?: SelectOption[];
  dependsOn?: {
    field: string;
    value: unknown;
  };
}

export interface ConfigSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  fields: ConfigField[];
}

export interface NodeConfigSchema {
  nodeType: NodeType;
  title: string;
  description?: string;
  icon?: string;
  sections: ConfigSection[];
}

// AI Agent Config Schema — real Gemini-backed agent
const aiAgentConfigSchema: NodeConfigSchema = {
  nodeType: 'ai-agent',
  title: 'AI Agent',
  description: 'Autonomous agent powered by Gemini. Connects tools, memory, and a chat model.',
  sections: [
    {
      id: 'agent',
      title: 'Agent Settings',
      fields: [
        {
          id: 'agentType',
          type: 'select',
          label: 'Agent Type',
          defaultValue: 'tools-agent',
          options: [
            { label: 'Tools Agent', value: 'tools-agent', description: 'Can call connected tools in a loop' },
            { label: 'Conversational Agent', value: 'conversational', description: 'Simple chat agent without tool use' },
          ],
        },
        {
          id: 'model',
          type: 'select',
          label: 'Chat Model',
          required: true,
          defaultValue: 'gemini-2.5-flash',
          options: [
            { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash', description: 'Fast, cost-effective' },
            { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro', description: 'Most capable, slower' },
          ],
        },
      ],
    },
    {
      id: 'prompts',
      title: 'Prompts',
      fields: [
        {
          id: 'systemPrompt',
          type: 'textarea',
          label: 'System Prompt',
          placeholder: 'You are a helpful assistant...\n\nDefine the agent\'s personality, role, and instructions here.',
          description: 'Character/personality instructions for the agent',
          required: true,
        },
        {
          id: 'userPrompt',
          type: 'textarea',
          label: 'User Message',
          placeholder: 'Hello! Tell me about yourself.\n\nUse {{nodeId.field}} to reference upstream data.',
          description: 'The input prompt. Supports {{nodeId.field}} template syntax.',
          required: true,
        },
      ],
    },
    {
      id: 'parameters',
      title: 'Model Parameters',
      collapsible: true,
      fields: [
        {
          id: 'temperature',
          type: 'number',
          label: 'Temperature',
          defaultValue: 0.7,
          validation: { min: 0, max: 2 },
          description: 'Higher = more creative, lower = more focused',
        },
        {
          id: 'maxTokens',
          type: 'number',
          label: 'Max Output Tokens',
          defaultValue: 4096,
          validation: { min: 1, max: 65536 },
          description: 'Maximum length of the response',
        },
        {
          id: 'maxIterations',
          type: 'number',
          label: 'Max Iterations',
          defaultValue: 5,
          validation: { min: 1, max: 10 },
          description: 'Maximum tool-calling loops before final answer',
        },
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      collapsible: true,
      defaultCollapsed: true,
      fields: [
        {
          id: 'returnIntermediateSteps',
          type: 'boolean',
          label: 'Return Intermediate Steps',
          defaultValue: false,
          description: 'Include tool call logs in the output',
        },
      ],
    },
  ],
};

// Trigger Config Schema
const triggerConfigSchema: NodeConfigSchema = {
  nodeType: 'trigger',
  title: 'Chat Trigger',
  description: 'Configure the trigger node',
  sections: [
    {
      id: 'general',
      title: 'Trigger Settings',
      fields: [
        {
          id: 'triggerType',
          type: 'select',
          label: 'Trigger Type',
          defaultValue: 'chat',
          options: [
            { label: 'Chat Message', value: 'chat' },
            { label: 'Webhook', value: 'webhook' },
            { label: 'Schedule', value: 'schedule' },
            { label: 'Manual', value: 'manual' },
          ],
        },
        {
          id: 'webhookPath',
          type: 'text',
          label: 'Webhook Path',
          placeholder: '/api/webhook',
          dependsOn: { field: 'triggerType', value: 'webhook' },
        },
        {
          id: 'schedule',
          type: 'text',
          label: 'Cron Schedule',
          placeholder: '0 * * * *',
          dependsOn: { field: 'triggerType', value: 'schedule' },
        },
      ],
    },
  ],
};

// HTTP Tool Config Schema
const httpToolConfigSchema: NodeConfigSchema = {
  nodeType: 'http-tool',
  title: 'HTTP Request',
  description: 'Configure HTTP request settings',
  sections: [
    {
      id: 'identity',
      title: 'Tool Identity',
      description: 'How the AI agent sees this tool',
      fields: [
        {
          id: 'toolName',
          type: 'text',
          label: 'Tool Name',
          placeholder: 'get_weather',
          description: 'Short identifier the agent uses to call this tool',
          required: true,
        },
        {
          id: 'toolDescription',
          type: 'textarea',
          label: 'Tool Description',
          placeholder: 'Fetches current weather data for a given city name.',
          description: 'What this tool does — helps the agent decide when to use it',
          required: true,
        },
        {
          id: 'parametersSchema',
          type: 'json',
          label: 'Parameters Schema',
          placeholder: '{"city": "string"}',
          description: 'JSON describing expected input parameters for the agent',
          defaultValue: {},
        },
      ],
    },
    {
      id: 'request',
      title: 'Request Settings',
      fields: [
        {
          id: 'method',
          type: 'select',
          label: 'Method',
          defaultValue: 'GET',
          options: [
            { label: 'GET', value: 'GET' },
            { label: 'POST', value: 'POST' },
            { label: 'PUT', value: 'PUT' },
            { label: 'PATCH', value: 'PATCH' },
            { label: 'DELETE', value: 'DELETE' },
          ],
        },
        {
          id: 'url',
          type: 'text',
          label: 'URL',
          placeholder: 'https://api.example.com/endpoint',
          required: true,
        },
        {
          id: 'headers',
          type: 'json',
          label: 'Headers',
          defaultValue: {},
          placeholder: '{"Content-Type": "application/json"}',
        },
        {
          id: 'body',
          type: 'json',
          label: 'Request Body',
          placeholder: '{}',
        },
        {
          id: 'timeout',
          type: 'number',
          label: 'Timeout (seconds)',
          defaultValue: 30,
          validation: { min: 1, max: 300 },
        },
      ],
    },
    {
      id: 'auth',
      title: 'Authentication',
      collapsible: true,
      fields: [
        {
          id: 'authType',
          type: 'select',
          label: 'Auth Type',
          defaultValue: 'none',
          options: [
            { label: 'None', value: 'none' },
            { label: 'API Key', value: 'apikey' },
            { label: 'Bearer Token', value: 'bearer' },
            { label: 'Basic Auth', value: 'basic' },
          ],
        },
        {
          id: 'credentials',
          type: 'credentials',
          label: 'Credentials',
          dependsOn: { field: 'authType', value: 'apikey' },
        },
      ],
    },
  ],
};

// Code Tool Config Schema
const codeToolConfigSchema: NodeConfigSchema = {
  nodeType: 'code-tool',
  title: 'Code',
  description: 'Configure code execution',
  sections: [
    {
      id: 'identity',
      title: 'Tool Identity',
      description: 'How the AI agent sees this tool',
      fields: [
        {
          id: 'toolName',
          type: 'text',
          label: 'Tool Name',
          placeholder: 'calculate_sum',
          description: 'Short identifier the agent uses to call this tool',
          required: true,
        },
        {
          id: 'toolDescription',
          type: 'textarea',
          label: 'Tool Description',
          placeholder: 'Runs a JavaScript calculation and returns the result.',
          description: 'What this tool does — helps the agent decide when to use it',
          required: true,
        },
      ],
    },
    {
      id: 'code',
      title: 'Code Settings',
      fields: [
        {
          id: 'language',
          type: 'select',
          label: 'Language',
          defaultValue: 'javascript',
          options: [
            { label: 'JavaScript', value: 'javascript' },
            { label: 'Python', value: 'python' },
            { label: 'TypeScript', value: 'typescript' },
          ],
        },
        {
          id: 'code',
          type: 'code',
          label: 'Code',
          placeholder: '// Write your code here',
          defaultValue: '// Enter code here\nreturn {};',
        },
        {
          id: 'timeout',
          type: 'number',
          label: 'Timeout (seconds)',
          defaultValue: 10,
          validation: { min: 1, max: 60 },
        },
      ],
    },
  ],
};

// Memory Config Schema
const memoryConfigSchema: NodeConfigSchema = {
  nodeType: 'memory',
  title: 'Memory',
  description: 'Persist conversation history for AI agents',
  sections: [
    {
      id: 'memory',
      title: 'Memory Settings',
      fields: [
        {
          id: 'memoryType',
          type: 'select',
          label: 'Memory Type',
          defaultValue: 'window-buffer',
          options: [
            { label: 'Window Buffer', value: 'window-buffer', description: 'Keeps last N messages in context' },
          ],
        },
        {
          id: 'sessionId',
          type: 'text',
          label: 'Session ID',
          placeholder: 'Auto-generated if empty',
          description: 'Groups messages by session. Leave blank for auto-generated per-workflow ID.',
        },
        {
          id: 'windowSize',
          type: 'number',
          label: 'Window Size',
          defaultValue: 10,
          validation: { min: 1, max: 100 },
          description: 'Number of past messages to load into context',
        },
        {
          id: 'clearOnRun',
          type: 'boolean',
          label: 'Clear on Run',
          defaultValue: false,
          description: 'Wipe memory before each execution',
        },
      ],
    },
  ],
};

// OpenAI Chat Config Schema
const openaiChatConfigSchema: NodeConfigSchema = {
  nodeType: 'openai-chat',
  title: 'OpenAI Chat Model',
  description: 'Configure OpenAI model settings',
  sections: [
    {
      id: 'model',
      title: 'Model Settings',
      fields: [
        {
          id: 'credentials',
          type: 'credentials',
          label: 'API Credentials',
          required: true,
        },
        {
          id: 'model',
          type: 'select',
          label: 'Model',
          defaultValue: 'gpt-4o-mini',
          options: [
            { label: 'GPT-4o', value: 'gpt-4o' },
            { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
          ],
        },
      ],
    },
  ],
};

// Anthropic Chat Config Schema
const anthropicChatConfigSchema: NodeConfigSchema = {
  nodeType: 'anthropic-chat',
  title: 'Anthropic Chat Model',
  description: 'Configure Anthropic model settings',
  sections: [
    {
      id: 'model',
      title: 'Model Settings',
      fields: [
        {
          id: 'credentials',
          type: 'credentials',
          label: 'API Credentials',
          required: true,
        },
        {
          id: 'model',
          type: 'select',
          label: 'Model',
          defaultValue: 'claude-sonnet-4-5-20250929',
          options: [
            { label: 'Claude Sonnet 4.5', value: 'claude-sonnet-4-5-20250929' },
            { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
            { label: 'Claude 3 Opus', value: 'claude-3-opus' },
            { label: 'Claude 3 Haiku', value: 'claude-3-haiku' },
          ],
        },
      ],
    },
  ],
};

// Webhook Config Schema
const webhookConfigSchema: NodeConfigSchema = {
  nodeType: 'webhook',
  title: 'Webhook',
  description: 'Configure webhook settings',
  sections: [
    {
      id: 'webhook',
      title: 'Webhook Settings',
      fields: [
        {
          id: 'webhookUrl',
          type: 'text',
          label: 'Webhook URL',
          placeholder: 'Auto-generated',
          disabled: true,
        },
        {
          id: 'method',
          type: 'select',
          label: 'HTTP Method',
          defaultValue: 'POST',
          options: [
            { label: 'POST', value: 'POST' },
            { label: 'GET', value: 'GET' },
            { label: 'PUT', value: 'PUT' },
          ],
        },
      ],
    },
  ],
};

// Image Generator Config Schema
const imageGenConfigSchema: NodeConfigSchema = {
  nodeType: 'image-gen',
  title: 'Image Generator',
  description: 'Generate images via Gemini Imagen',
  sections: [
    {
      id: 'image',
      title: 'Image Settings',
      fields: [
        {
          id: 'prompt',
          type: 'textarea',
          label: 'Prompt',
          placeholder: 'Describe the image you want to generate...',
          required: true,
        },
        {
          id: 'style',
          type: 'select',
          label: 'Style',
          defaultValue: 'vivid',
          options: [
            { label: 'Vivid', value: 'vivid' },
            { label: 'Photorealistic', value: 'photorealistic' },
            { label: 'Anime', value: 'anime' },
            { label: 'Watercolor', value: 'watercolor' },
            { label: 'Pixel Art', value: 'pixel-art' },
            { label: 'Film Noir', value: 'film-noir' },
          ],
        },
        {
          id: 'agentId',
          type: 'text',
          label: 'Agent ID',
          placeholder: 'Optional agent identifier',
          description: 'For logging which agent requested the image',
        },
      ],
    },
  ],
};

// Gemini Chat Config Schema
const geminiChatConfigSchema: NodeConfigSchema = {
  nodeType: 'gemini-chat',
  title: 'Gemini Chat',
  description: 'Text/chat completions via Gemini',
  sections: [
    {
      id: 'model',
      title: 'Model Settings',
      fields: [
        {
          id: 'model',
          type: 'select',
          label: 'Model',
          defaultValue: 'gemini-2.5-flash',
          options: [
            { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash', description: 'Fast and efficient' },
            { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro', description: 'Most capable' },
          ],
        },
        {
          id: 'systemPrompt',
          type: 'textarea',
          label: 'System Prompt',
          placeholder: 'Enter system instructions...',
          description: 'Instructions that define model behavior',
        },
        {
          id: 'temperature',
          type: 'number',
          label: 'Temperature',
          defaultValue: 0.7,
          validation: { min: 0, max: 2 },
          description: 'Controls randomness',
        },
        {
          id: 'maxTokens',
          type: 'number',
          label: 'Max Tokens',
          defaultValue: 4096,
          validation: { min: 1, max: 65536 },
        },
      ],
    },
  ],
};

// Gemini Embed Config Schema
const geminiEmbedConfigSchema: NodeConfigSchema = {
  nodeType: 'gemini-embed',
  title: 'Gemini Embed',
  description: 'Text embeddings via Gemini',
  sections: [
    {
      id: 'embed',
      title: 'Embedding Settings',
      fields: [
        {
          id: 'model',
          type: 'select',
          label: 'Model',
          defaultValue: 'gemini-embedding-001',
          options: [
            { label: 'Gemini Embedding 001', value: 'gemini-embedding-001' },
          ],
        },
        {
          id: 'text',
          type: 'textarea',
          label: 'Input Text',
          placeholder: 'Text to embed...',
          required: true,
        },
      ],
    },
  ],
};

// Gemini Vision Config Schema
const geminiVisionConfigSchema: NodeConfigSchema = {
  nodeType: 'gemini-vision',
  title: 'Gemini Vision',
  description: 'Image understanding via Gemini',
  sections: [
    {
      id: 'vision',
      title: 'Vision Settings',
      fields: [
        {
          id: 'model',
          type: 'select',
          label: 'Model',
          defaultValue: 'gemini-2.5-flash',
          options: [
            { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
            { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
          ],
        },
        {
          id: 'prompt',
          type: 'textarea',
          label: 'Prompt',
          placeholder: 'What would you like to know about the image?',
          required: true,
        },
        {
          id: 'imageUrl',
          type: 'text',
          label: 'Image URL',
          placeholder: 'https://example.com/image.png',
          required: true,
        },
      ],
    },
  ],
};

// New n8n-aligned config schemas

const gmailConfigSchema: NodeConfigSchema = {
  nodeType: 'gmail',
  title: 'Gmail',
  description: 'Read, send, or label emails',
  sections: [{
    id: 'gmail',
    title: 'Gmail Settings',
    fields: [
      { id: 'action', type: 'select', label: 'Action', defaultValue: 'fetch_emails', options: [
        { label: 'Fetch Emails', value: 'fetch_emails' },
        { label: 'Send Email', value: 'send_email' },
        { label: 'Label Email', value: 'label_email' },
      ]},
      { id: 'query', type: 'text', label: 'Search Query', placeholder: 'is:unread from:example@gmail.com', description: 'Gmail search query (optional)' },
    ],
  }],
};

const slackConfigSchema: NodeConfigSchema = {
  nodeType: 'slack',
  title: 'Slack',
  description: 'Post messages to Slack channels',
  sections: [{
    id: 'slack',
    title: 'Slack Settings',
    fields: [
      { id: 'action', type: 'select', label: 'Action', defaultValue: 'post_message', options: [
        { label: 'Post Message', value: 'post_message' },
        { label: 'Get Channel Info', value: 'get_channel' },
      ]},
      { id: 'channel', type: 'text', label: 'Channel', placeholder: '#general', required: true },
    ],
  }],
};

const setConfigSchema: NodeConfigSchema = {
  nodeType: 'set',
  title: 'Set',
  description: 'Set or transform field values',
  sections: [{
    id: 'set',
    title: 'Set Fields',
    fields: [
      { id: 'keyValuePairs', type: 'json', label: 'Key-Value Pairs', placeholder: '{"key": "value"}', description: 'JSON object of fields to set', defaultValue: {} },
    ],
  }],
};

const scheduleConfigSchema: NodeConfigSchema = {
  nodeType: 'schedule',
  title: 'Schedule',
  description: 'Run workflow on a cron schedule',
  sections: [{
    id: 'schedule',
    title: 'Schedule Settings',
    fields: [
      { id: 'cron', type: 'text', label: 'Cron Expression', placeholder: '0 9 * * *', description: 'Standard cron syntax (minute hour day month weekday)', required: true },
    ],
  }],
};

const ifConfigSchema: NodeConfigSchema = {
  nodeType: 'if',
  title: 'IF',
  description: 'Branch on a condition',
  sections: [{
    id: 'condition',
    title: 'Condition',
    fields: [
      { id: 'condition', type: 'text', label: 'Condition Expression', placeholder: '{{node1.count}} > 0', description: 'Expression to evaluate. Use {{nodeId.field}} syntax.', required: true },
    ],
  }],
};

const mergeConfigSchema: NodeConfigSchema = {
  nodeType: 'merge',
  title: 'Merge',
  description: 'Combine data from multiple branches',
  sections: [{
    id: 'merge',
    title: 'Merge Settings',
    fields: [
      { id: 'mode', type: 'select', label: 'Mode', defaultValue: 'append', options: [
        { label: 'Append', value: 'append', description: 'Combine all items' },
        { label: 'Merge by Key', value: 'merge_by_key', description: 'Match items by a key field' },
      ]},
    ],
  }],
};

// --- Game Node Schemas ---

/** Shared player-id field for all game nodes */
const gamePlayerIdField: ConfigField = {
  id: 'playerId',
  type: 'text',
  label: 'Player ID',
  placeholder: 'studio-test',
  description: 'Target player ID (defaults to "studio-test" for Studio previews)',
  defaultValue: 'studio-test',
};

const gameShowTextConfigSchema: NodeConfigSchema = {
  nodeType: 'game-show-text',
  title: 'Show Text',
  description: 'Display a message to the player in the game',
  sections: [{
    id: 'show-text',
    title: 'Show Text Settings',
    fields: [
      { id: 'text', type: 'textarea', label: 'Message', placeholder: 'Hello, adventurer!', description: 'Text to display to the player', required: true },
      { id: 'talkWith', type: 'text', label: 'Talk With (optional)', placeholder: 'npc-id or event name', description: 'Attach dialog to an NPC or event' },
      gamePlayerIdField,
    ],
  }],
};

const gameGiveItemConfigSchema: NodeConfigSchema = {
  nodeType: 'game-give-item',
  title: 'Give Item',
  description: 'Add item(s) to player inventory',
  sections: [{
    id: 'give-item',
    title: 'Give Item Settings',
    fields: [
      { id: 'itemId', type: 'text', label: 'Item ID', placeholder: 'e.g. email, tagged-email', description: 'The item type identifier', required: true },
      { id: 'count', type: 'number', label: 'Count', defaultValue: 1, description: 'Number of items to give' },
      gamePlayerIdField,
    ],
  }],
};

const gameGiveGoldConfigSchema: NodeConfigSchema = {
  nodeType: 'game-give-gold',
  title: 'Give Gold',
  description: 'Add gold to the player',
  sections: [{
    id: 'give-gold',
    title: 'Give Gold Settings',
    fields: [
      { id: 'amount', type: 'number', label: 'Amount', defaultValue: 10, description: 'Gold amount to award', required: true },
      gamePlayerIdField,
    ],
  }],
};

const gameTeleportConfigSchema: NodeConfigSchema = {
  nodeType: 'game-teleport',
  title: 'Teleport Player',
  description: 'Move player to a map/position',
  sections: [{
    id: 'teleport',
    title: 'Teleport Settings',
    fields: [
      { id: 'mapId', type: 'text', label: 'Map ID', placeholder: 'e.g. main-town', description: 'Target map identifier', required: true },
      { id: 'x', type: 'number', label: 'X Position', defaultValue: 0, description: 'Horizontal tile position' },
      { id: 'y', type: 'number', label: 'Y Position', defaultValue: 0, description: 'Vertical tile position' },
      gamePlayerIdField,
    ],
  }],
};

const gameOpenGuiConfigSchema: NodeConfigSchema = {
  nodeType: 'game-open-gui',
  title: 'Open GUI',
  description: 'Open a GUI overlay in the game',
  sections: [{
    id: 'open-gui',
    title: 'GUI Settings',
    fields: [
      { id: 'guiId', type: 'text', label: 'GUI ID', placeholder: 'e.g. shop, inventory', description: 'The GUI component to open', required: true },
      { id: 'data', type: 'json', label: 'Data (optional)', placeholder: '{"title": "My Shop"}', description: 'JSON data to pass to the GUI' },
      gamePlayerIdField,
    ],
  }],
};

const gameSetVariableConfigSchema: NodeConfigSchema = {
  nodeType: 'game-set-variable',
  title: 'Set Variable',
  description: 'Set a player or scene variable',
  sections: [{
    id: 'set-variable',
    title: 'Set Variable Settings',
    fields: [
      { id: 'key', type: 'text', label: 'Key', placeholder: 'e.g. questStarted', description: 'Variable name', required: true },
      { id: 'value', type: 'text', label: 'Value', placeholder: 'true', description: 'Value to assign (string, number, or boolean)' },
      gamePlayerIdField,
    ],
  }],
};

// Schema registry
const schemas: Record<string, NodeConfigSchema> = {
  'ai-agent': aiAgentConfigSchema,
  'trigger': triggerConfigSchema,
  'http-tool': httpToolConfigSchema,
  'code-tool': codeToolConfigSchema,
  'memory': memoryConfigSchema,
  'openai-chat': openaiChatConfigSchema,
  'anthropic-chat': anthropicChatConfigSchema,
  'webhook': webhookConfigSchema,
  'image-gen': imageGenConfigSchema,
  'gemini-chat': geminiChatConfigSchema,
  'gemini-embed': geminiEmbedConfigSchema,
  'gemini-vision': geminiVisionConfigSchema,
  'gmail': gmailConfigSchema,
  'slack': slackConfigSchema,
  'set': setConfigSchema,
  'schedule': scheduleConfigSchema,
  'if': ifConfigSchema,
  'merge': mergeConfigSchema,
  'game-show-text':    gameShowTextConfigSchema,
  'game-give-item':    gameGiveItemConfigSchema,
  'game-give-gold':    gameGiveGoldConfigSchema,
  'game-teleport':     gameTeleportConfigSchema,
  'game-open-gui':     gameOpenGuiConfigSchema,
  'game-set-variable': gameSetVariableConfigSchema,
};

export function getNodeConfigSchema(nodeType: NodeType): NodeConfigSchema | undefined {
  return schemas[nodeType];
}

export function getDefaultValues(schema: NodeConfigSchema): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  schema.sections.forEach(section => {
    section.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      }
    });
  });
  return defaults;
}

export function validateField(value: unknown, field: ConfigField): string | undefined {
  if (field.required && (value === undefined || value === null || value === '')) {
    return `${field.label} is required`;
  }

  if (field.validation) {
    const { min, max, pattern, custom } = field.validation;

    if (typeof value === 'number') {
      if (min !== undefined && value < min) return `${field.label} must be at least ${min}`;
      if (max !== undefined && value > max) return `${field.label} must be at most ${max}`;
    }

    if (typeof value === 'string') {
      if (min !== undefined && value.length < min) return `${field.label} must be at least ${min} characters`;
      if (max !== undefined && value.length > max) return `${field.label} must be at most ${max} characters`;
      if (pattern && !new RegExp(pattern).test(value)) return `${field.label} format is invalid`;
    }

    if (custom) {
      const customError = custom(value);
      if (customError) return customError;
    }
  }

  return undefined;
}
