# Schema Mapping: Old vs New

## Column Name Changes

| Old (Code) | New (Database) | Notes |
|------------|----------------|-------|
| `enabled` | `is_enabled` | Boolean flag |
| `spawn` | `spawn_config` | JSON with {mapId, x, y} |
| `personality` | `prompt` | Main AI instruction text |
| `graphic` | `default_sprite` | Sprite identifier |
| `skills` | `skills` | But structure changed |
| `inventory` | `required_tokens` | API tokens needed |
| `behavior` | `behavior` | JSON structure |

## Data Structure Mapping

### Old Format (TypeScript Interface)
```typescript
interface AgentConfig {
  id: string;
  name: string;
  graphic: string;
  personality: string;
  model: { idle: string; conversation: string };
  skills: string[];  // Simple array
  spawn: { map: string; x: number; y: number };
  behavior: { 
    idleInterval: number; 
    patrolRadius: number; 
    greetOnProximity: boolean 
  };
  inventory: string[];
  enabled: boolean;
}
```

### New Format (Database)
```typescript
interface AgentConfig {
  id: string;
  name: string;
  default_sprite: string;
  prompt: string;  // Was personality
  model: { 
    provider: string;
    conversation: string; 
    temperature: number;
  };
  skills: Array<{name: string, description?: string}>;  // Object array
  spawn_config: { mapId: string; x: number; y: number };  // Was spawn
  behavior: { 
    wander?: boolean;
    wanderRadius?: number;
    patrolPath?: any[];
    idleInterval?: number;
    patrolRadius?: number;
    greetOnProximity?: boolean;
  };
  required_tokens: string[];  // Was inventory
  is_enabled: boolean;  // Was enabled
  category?: string;
  base_entity_type?: string;
  icon?: string;
  description?: string;
  welcome_message?: string;
  personality?: any;  // JSON for traits/voice
  memory_config?: any;
  appearance?: any;
  created_at?: string;
  updated_at?: string;
}
```

## Helper Functions Needed

### Database → UI (normalizeConfig)
```typescript
function normalizeFromDB(dbRecord: any): AgentConfig {
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    graphic: dbRecord.default_sprite || dbRecord.appearance?.sprite || 'female',
    personality: dbRecord.prompt || dbRecord.personality,
    model: {
      idle: dbRecord.model?.idle || 'kimi-k2-0711-preview',
      conversation: dbRecord.model?.conversation || dbRecord.model?.model || 'kimi-k2-0711-preview'
    },
    skills: dbRecord.skills?.map((s: any) => typeof s === 'string' ? s : s.name) || [],
    spawn: {
      map: dbRecord.spawn_config?.mapId || 'simplemap',
      x: dbRecord.spawn_config?.x ?? 400,
      y: dbRecord.spawn_config?.y ?? 300
    },
    behavior: {
      idleInterval: dbRecord.behavior?.idleInterval || 0,
      patrolRadius: dbRecord.behavior?.patrolRadius || dbRecord.behavior?.wanderRadius || 0,
      greetOnProximity: dbRecord.behavior?.greetOnProximity || false
    },
    inventory: dbRecord.required_tokens || [],
    enabled: dbRecord.is_enabled ?? true,
    // Keep original for saving back
    _raw: dbRecord
  };
}
```

### UI → Database (prepareForDB)
```typescript
function prepareForDB(uiData: AgentConfig): any {
  return {
    id: uiData.id,
    name: uiData.name,
    default_sprite: uiData.graphic,
    prompt: uiData.personality,
    model: {
      provider: 'kimi',
      conversation: uiData.model.conversation,
      temperature: 0.7
    },
    skills: uiData.skills.map(s => ({ name: s, description: '' })),
    spawn_config: {
      mapId: uiData.spawn.map,
      x: uiData.spawn.x,
      y: uiData.spawn.y
    },
    behavior: {
      wander: uiData.behavior.patrolRadius > 0,
      wanderRadius: uiData.behavior.patrolRadius,
      idleInterval: uiData.behavior.idleInterval,
      greetOnProximity: uiData.behavior.greetOnProximity
    },
    required_tokens: uiData.inventory,
    is_enabled: uiData.enabled,
    category: 'npc',
    base_entity_type: 'ai-npc',
    icon: '🤖',
    welcome_message: 'Hello!',
    description: uiData.personality.slice(0, 100)
  };
}
```
