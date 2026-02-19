

## Wire Game Nodes to object-action Edge Function

### Goal
When a game node (e.g., `game-show-text`, `game-give-item`) executes in the Workflow Editor, it will call the `object-action` edge function instead of falling through to the simulated default. The edge function proxies the request to an n8n webhook (if registered) or returns `NO_WORKFLOW` gracefully.

### What Changes

**1. `src/hooks/useExecution.ts` -- Add game node cases to `executeNodeByType`**

Add a new case block (before the `default`) handling all 6 game node types:
- `game-show-text`
- `game-give-item`
- `game-give-gold`
- `game-teleport`
- `game-open-gui`
- `game-set-variable`

Each case will:
1. Extract the relevant config fields (e.g., `message`, `itemId`, `amount`, `mapId`, etc.) with template resolution via `resolveTemplates`
2. Map the node type to `object_type` + `action` for the edge function (e.g., `game-show-text` becomes `object_type: "game"`, `action: "show-text"`)
3. Call `supabase.functions.invoke('object-action', { body: { object_type, action, player_id, inputs } })`
4. Handle the response:
   - If `NO_WORKFLOW` code is returned, mark success with a note that no n8n workflow is wired yet (graceful fallback)
   - If n8n returns a result, pass it through as the node result
   - If `N8N_UNREACHABLE` or other errors, mark the node as failed

The `player_id` will default to `"studio-test"` (since Studio doesn't have a real player context) but can be overridden via a config field.

**2. No edge function changes needed**

The `object-action` edge function already:
- Accepts `object_type`, `action`, `player_id`, `inputs`
- Looks up `n8n_webhook_registry` by `action_key` (`{object_type}.{action}`)
- Proxies to n8n or returns `NO_WORKFLOW`

### Data Flow

```text
Studio Workflow Editor
  --> executeNodeByType("game-show-text")
    --> supabase.functions.invoke("object-action")
      --> Looks up n8n_webhook_registry for "game.show-text"
        --> If found: POST to n8n webhook URL, return result
        --> If not found: return { code: "NO_WORKFLOW" }
    --> Node result displayed in Execution Results Panel
```

### Technical Details

The new case block in `executeNodeByType` (~lines 395-401 area) will look like:

```typescript
case 'game-show-text':
case 'game-give-item':
case 'game-give-gold':
case 'game-teleport':
case 'game-open-gui':
case 'game-set-variable': {
  // Split "game-show-text" into object_type="game", action="show-text"
  const parts = node.type.split('-');
  const object_type = parts[0]; // "game"
  const action = parts.slice(1).join('-'); // "show-text"

  // Build inputs from config with template resolution
  const inputs: Record<string, any> = {};
  Object.entries(config).forEach(([key, val]) => {
    inputs[key] = typeof val === 'string'
      ? resolveTemplates(val, nodeResults)
      : val;
  });

  const player_id = resolveTemplates(
    config.playerId ?? 'studio-test', nodeResults
  );

  const { data, error } = await supabase.functions.invoke('object-action', {
    body: { object_type, action, player_id, inputs },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // NO_WORKFLOW is not a failure — just means n8n isn't wired yet
  if (data?.error?.code === 'NO_WORKFLOW') {
    return {
      success: true,
      data: {
        type: node.type,
        action_key: `${object_type}.${action}`,
        status: 'no_workflow',
        message: data.error.message,
      },
    };
  }

  // n8n unreachable or other errors
  if (data?.success === false) {
    return {
      success: false,
      error: data.error?.message || 'object-action failed',
    };
  }

  // n8n returned a result
  return { success: true, data };
}
```

### What Users Will See

- **No n8n configured (typical):** Node completes with green checkmark showing `{ status: "no_workflow", action_key: "game.show-text", message: "No active n8n workflow registered..." }`
- **n8n connected:** Node completes with the actual n8n response data
- **n8n unreachable:** Node fails with red error showing the connection error

### Files Modified
- `src/hooks/useExecution.ts` -- 1 new case block (~25 lines)

