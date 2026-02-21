

# Client-Side Batching for embed-lore + End-to-End RAG Test

## Part 1: Add Batching to `embed-lore` Edge Function

The current `embed-lore` function processes all chunks sequentially in a single invocation. For large documents (20+ chunks), this can hit Supabase edge function timeouts. The fix is to add server-side batching with small delays between batches to avoid rate limits.

### Changes to `supabase/functions/embed-lore/index.ts`

- Process chunks in batches of 5 (instead of all at once sequentially)
- Add a 500ms delay between batches to respect Gemini API rate limits
- Add progress logging per batch
- Accept an optional `batchSize` parameter for flexibility

### Changes to `src/hooks/useWorldLore.ts`

- Update `useExtractLoreText` to handle the two-step flow more robustly
- Add a retry mechanism: if `embed-lore` times out on the first attempt, re-invoke it (it deletes existing embeddings first, so re-runs are safe)
- Surface chunk count in the success toast

### Changes to `src/components/lore/LoreEntryCard.tsx`

- Show embedding progress: query `lore_embeddings` count for the entry to show "X chunks indexed" badge when processing is complete
- Keep the "Processing..." spinner while content is null

## Part 2: End-to-End Testing

After deploying the batched embed-lore function, manually test:

1. Navigate to World Lore Workshop
2. Upload a PDF document
3. Verify the "Extracting document text..." toast appears
4. Verify the "Processing..." badge shows on the card, then disappears
5. Check `lore_embeddings` table for chunks with embeddings
6. Ask the Lorekeeper a specific question about the document
7. Verify source citation badges appear on the response

## Technical Details

### Batched embedding loop (embed-lore)

```text
const BATCH_SIZE = 5;
for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
  const batch = chunks.slice(i, i + BATCH_SIZE);
  // Process batch in parallel with Promise.all
  // Insert results
  // Wait 500ms before next batch
}
```

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/embed-lore/index.ts` | Add batch processing (groups of 5), delay between batches |
| `src/hooks/useWorldLore.ts` | Minor: improve error handling in extraction mutation |
| `src/components/lore/LoreEntryCard.tsx` | Show chunk count badge when embeddings exist |

