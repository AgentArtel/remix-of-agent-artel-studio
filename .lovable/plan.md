

# Fix: npc-ai-chat Build Error + PicoClaw Gemini Routing Update

## Summary

Two items to address:

1. **Build error** in `supabase/functions/npc-ai-chat/index.ts` (line 347) -- TypeScript error `TS2339: Property 'fragmentResult' does not exist on type '{ text: any; }'`
2. **Acknowledge the PicoClaw Gemini fix** -- the `picoclaw-bridge` change is already applied (API_BASE_MAP gemini URL updated)

## Build Error Fix

The `response` variable is inferred from the LLM call functions (callKimi, callGemini, etc.) which return `{ text, toolCalls?, tokens? }`. Line 347 tries to assign `response.fragmentResult = fragmentResult`, which TypeScript rejects.

**Fix:** Instead of mutating `response`, build the final response object inline when constructing the JSON response body:

```typescript
// Replace lines 345-352:
const finalResponse = {
  ...response,
  ...(fragmentResult ? { fragmentResult } : {})
};

return new Response(
  JSON.stringify(finalResponse),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)
```

This avoids mutating a typed object and cleanly merges the fragment result.

## PicoClaw Status

The Gemini routing fix from Claude Code is confirmed:
- `picoclaw-bridge/index.ts` line 42 now has `gemini: 'https://generativelanguage.googleapis.com/v1beta/openai'`
- PicoClaw Go code on Railway is rebuilt with correct Gemini base URL
- All 4 Gemini-backed agents should now work through PicoClaw

## Follow-up (noted, not in this task)

Two edge functions still bypass PicoClaw and use Lovable AI Gateway directly:
- `scaffold-game-design` (the-architect diagrams)
- `extract-lore-text` (lore chunking)

These can be refactored to use PicoClaw now that Gemini routing works.

## Technical Details

**File changed:** `supabase/functions/npc-ai-chat/index.ts` (lines 345-352)

**Change:** Replace direct property assignment on typed response object with spread-based object composition for the final JSON response.

