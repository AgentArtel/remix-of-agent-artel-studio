

# Track A: Studio Workflow Editor -- Implementation Plan

## Overview
Wire the Studio workflow editor to Supabase for real save/load, align node types with n8n vocabulary, persist execution results, and create a `studio-run` Edge Function as the future n8n bridge. The local execution engine (`useExecution.ts`) is NOT modified.

---

## Step 1 -- A-0: Fix Workflow Save

**File: `src/pages/WorkflowEditorPage.tsx`**

- Import `supabase` from `@/integrations/supabase/client`
- Add state: `workflowId` (initialized via `crypto.randomUUID()`), `isSaving` (boolean)
- Replace the `handleSaveWorkflow` stub (line 670-673) with a real `supabase.from('studio_workflows').upsert(...)` call using columns: `id`, `name`, `nodes_data`, `connections_data`, `node_count`, `status`, `updated_at`
- Use existing toast helpers: `showSuccess('Workflow saved')` / `showError(err.message)` (NOT `toast({ title })`)
- Pass `isSaving` to Header so the Save button can show a loading state

**File: `src/components/Header.tsx`**

- Add optional `isSaving?: boolean` prop
- When `isSaving` is true, disable the Save button and show a spinner icon

---

## Step 2 -- A-1: Load Workflow from URL

**File: `src/pages/WorkflowEditorPage.tsx`**

The app uses `currentPage` state (not routes) for navigation. To support opening a specific workflow:

- Add a `loadedWorkflowId` state that can be set from outside (via a new optional `initialWorkflowId` prop)
- On mount, if `initialWorkflowId` is provided: set `workflowId`, fetch from `studio_workflows` by ID, hydrate `nodes`, `connections`, `workflowName` via the existing `reset()` from undo/redo hook
- Show a loading spinner while fetching

**File: `src/App.tsx`**

- Add state to track the workflow ID to edit (e.g., `editorWorkflowId`)
- Update `onNavigate` to parse an ID from the page string (e.g., `editor:uuid`) and pass it as `initialWorkflowId` prop to `WorkflowEditorPage`

**File: `src/pages/WorkflowList.tsx`**

- Change `onNavigate('editor')` calls on workflow click/edit (lines 129, 157) to `onNavigate('editor:<workflow.id>')` so clicking a workflow opens it for editing
- "Create Workflow" button (line 83) stays as `onNavigate('editor')` (no ID = new workflow)

---

## Step 3 -- A-7: Inline Workflow Name Editing

**File: `src/components/Header.tsx`**

- Add `onNameChange?: (name: string) => void` prop
- Replace the static `<h1>{workflowName}</h1>` (line 105) with a click-to-edit input:
  - Default: displays as text
  - On click: becomes an `<input>` with `autoFocus`
  - On blur or Enter: calls `onNameChange` with the new value

**File: `src/pages/WorkflowEditorPage.tsx`**

- Pass `onNameChange={setWorkflowName}` to Header

---

## Step 4 -- A-2: Node Types -- Align with n8n

**File: `src/types/index.ts`**

- Add new values to `NodeType` union: `'gmail'`, `'slack'`, `'set'`
- Types `'if'`, `'merge'`, `'openai-chat'`, `'anthropic-chat'` already exist -- keep them

**File: `src/components/canvas/NodeSearchPalette.tsx`**

- Replace `nodeCategories` (lines 19-71) with n8n-aligned groups:
  - **Triggers**: Manual Trigger (rename from "Chat Message"), Webhook, Schedule
  - **Actions**: Gmail (new, `Mail` icon), Slack (new, `MessageSquare` icon), HTTP Request
  - **Data**: Set (new, `Pencil` icon), IF, Code, Merge
  - **AI**: AI Agent, OpenAI Chat, Claude, Gemini Chat
  - **Utilities**: Image Gen, Memory, Gemini Embed, Gemini Vision
- Keep existing structure: `NodeCategory` with `id`, `label`, `nodes` and `NodeItem` with `id`, `type`, `label`, `description`, `icon` (Lucide component)
- Import new Lucide icons: `Mail`, `Pencil`

**File: `src/pages/WorkflowEditorPage.tsx`**

- Add display configs (color/icon mapping) for new node types: `gmail`, `slack`, `set` in the `getNodeColor`/`getNodeIcon` functions (wherever node styling is determined)
- Add connection rule: in the `onConnectionCreate` callback, check if the target node type is `trigger`, `webhook`, or `schedule` -- if so, reject with `showError('Trigger nodes cannot have inputs')`

---

## Step 5 -- A-3: Config Panel Fields for New Node Types

**File: `src/lib/nodeConfig.ts`**

Add new schemas to the registry (line 693-706) for the new node types:

- **gmail**: section with `action` (select: fetch_emails / send_email / label_email), `query` (text, optional)
- **slack**: section with `action` (select: post_message / get_channel), `channel` (text)
- **set**: section with `keyValuePairs` (json field for key-value pairs)
- **schedule** (currently missing): section with `cron` (text, placeholder `0 9 * * *`)

The existing `if` and `merge` types also need schemas:
- **if**: section with `condition` (text, expression like `{{node1.count}} > 0`)
- **merge**: section with `mode` (select: append / merge_by_key)

---

## Step 6 -- A-4: Persist Execution Results

**File: `src/pages/WorkflowEditorPage.tsx`**

- Add `currentExecutionId` state (string or null)
- In the `onExecutionStart` callback (line 217): create a `studio_executions` row with `id`, `workflow_id`, `status: 'running'`, `started_at`
- In the `onExecutionComplete` callback (line 220): update that row to `status: 'success'`, set `completed_at`, `duration_ms` (from `result.duration`), `node_results` (from `nodeResults`)
- In the `onExecutionError` callback (line 227): update to `status: 'error'`, set `error_message`
- Also update `studio_workflows` row: set `last_run_at` and increment `execution_count`

The `useExecution` hook already exposes `executionState`, `nodeResults`, and passes `result.duration` in the `onExecutionComplete` callback -- no changes needed to the hook.

---

## Step 7 -- A-5: Create `studio-run` Edge Function

**New file: `supabase/functions/studio-run/index.ts`**

- Accepts POST with `{ workflow_id, workflow_graph }`
- Loads workflow from `studio_workflows` if no graph provided
- Since `n8n_webhook_registry` table does not exist yet, always returns `{ success: false, mode: 'simulate', error: { code: 'N8N_NOT_CONFIGURED' } }`
- Future: when that table is created, the function will check it and forward to n8n
- Includes standard CORS headers

**File: `supabase/config.toml`**

- Add `[functions.studio-run]` with `verify_jwt = false`

**File: `src/pages/WorkflowEditorPage.tsx`**

- Update `handleRunWorkflow` to call `studio-run` Edge Function first via `fetch` using `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY`
- If response is `{ mode: 'n8n', success: true }` -- use n8n results
- If response is `{ mode: 'simulate' }` or network error -- fall back to `startExecution()` (existing local engine)
- The local engine always remains the fallback

---

## Step 8 -- A-6: Verify Execution History + Dashboard

**File: `src/pages/ExecutionHistory.tsx`**

- Verify it reads from `studio_executions` with `duration_ms` and `node_results` columns displayed
- Minor tweaks if any columns are missing from the display

**File: `src/pages/Dashboard.tsx`**

- Verify "Recent Workflows" pulls real `last_run_at` and `execution_count` from `studio_workflows`

---

## Implementation Order

| Step | Phase | Files | Complexity |
|------|-------|-------|------------|
| 1 | A-0 | WorkflowEditorPage.tsx, Header.tsx | Low |
| 2 | A-1 | WorkflowEditorPage.tsx, App.tsx, WorkflowList.tsx | Low |
| 3 | A-7 | Header.tsx, WorkflowEditorPage.tsx | Low |
| 4 | A-2 | types/index.ts, NodeSearchPalette.tsx, WorkflowEditorPage.tsx | Medium |
| 5 | A-3 | nodeConfig.ts | Medium |
| 6 | A-4 | WorkflowEditorPage.tsx | Medium |
| 7 | A-5 | functions/studio-run/index.ts, config.toml, WorkflowEditorPage.tsx | Medium |
| 8 | A-6 | ExecutionHistory.tsx, Dashboard.tsx | Low |

## Key Constraints
- `useExecution.ts` is NOT modified
- Toast API: use `showSuccess()` / `showError()` / `showInfo()` from `useToast` hook (not shadcn `toast()`)
- Column names: `nodes_data`, `connections_data` (not `graph`)
- `studio_workflows.status`: `'active' | 'inactive' | 'error'`
- `studio_executions.status`: `'success' | 'error' | 'running' | 'pending'`
- NodeSearchPalette keeps Lucide component icons (not string emojis)
- Navigation uses `currentPage` state pattern (not react-router routes) -- pass workflow ID via `onNavigate('editor:<id>')` convention
- Env var for fetch: `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` (confirmed in `.env`)
- `n8n_webhook_registry` table does not exist yet -- Edge Function returns `simulate` mode unconditionally for now
- Graph format stored as-is (engine-agnostic); no transformation on save

