

## Auto-Save Workflow Before Running

### Problem
When clicking "Run", the workflow may not be saved to the database yet, causing potential issues with execution tracking and the `studio-run` edge function.

### Solution
Add an auto-save step at the beginning of `handleRunWorkflow` that upserts the current workflow state to `studio_workflows` before creating the execution record and calling the edge function.

### Changes

**File: `src/pages/WorkflowEditorPage.tsx`**

In `handleRunWorkflow` (around line 524), insert an auto-save block right after the `isExecuting` check (line 529) and before creating the execution record (line 531):

1. Call `supabase.from('studio_workflows').upsert(...)` with the current `workflowId`, `workflowName`, `nodes`, and `connections` -- reusing the same upsert pattern from `handleSaveWorkflow` (line 575-598).
2. If the save fails, show an error toast and return early (don't proceed with execution).
3. Add `nodes`, `connections`, `workflowName` to the `useCallback` dependency array (line 570).

The auto-save block will look roughly like:

```
// Auto-save workflow before running
const { error: saveError } = await supabase
  .from('studio_workflows')
  .upsert({
    id: workflowId,
    name: workflowName,
    nodes_data: nodes,
    connections_data: connections,
    node_count: nodes.length,
    status: 'active',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  .select()
  .single();

if (saveError) {
  showError('Failed to save workflow before running');
  return;
}
```

No other files need changes. After implementation, I will test end-to-end by navigating to the workflow editor, adding nodes, and clicking Run to verify no 404 errors occur.

