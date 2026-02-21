

# Fix File Uploads for World Lore

## Problem

When you upload a PDF (or any non-text file), the file goes to Supabase Storage but the `content` column in `world_lore_entries` stays `null`. The Lorekeeper then sees "(no text content)" because it only reads the `content` field -- it never fetches the actual file from storage.

The current upload flow only extracts text for `.txt`, `.md`, and `.json` files using the browser's `file.text()` API. PDFs and other binary documents are skipped entirely.

## Solution

Two-part fix:

### Part 1: Edge Function -- `extract-lore-text`

Create a new Supabase edge function that:
1. Receives a `world_lore_entries` record ID
2. Downloads the file from the `world-lore` storage bucket
3. For PDFs: uses a lightweight PDF text extraction approach (parse the raw PDF buffer for text streams)
4. For text-based files that were missed: reads them as UTF-8
5. Updates the `content` column on the `world_lore_entries` row with the extracted text

This keeps PDF parsing server-side where it belongs, and decouples it from the upload step.

### Part 2: Update `LoreUploader` + `useCreateLoreEntry`

After a file upload succeeds and the DB row is created:
1. If the file is a PDF or other binary document (not already text-extracted), call the `extract-lore-text` edge function with the entry ID
2. Show a "Processing..." indicator on the lore entry card while extraction runs
3. Invalidate the query cache once extraction completes so the entry refreshes with its content

### Part 3: Fallback -- Direct Storage Fetch in `buildLoreContext`

As a safety net, update `buildLoreContext` in `LorekeeperChat.tsx` so that if a lore entry has a `storage_path` but no `content`, it fetches the file from storage on-demand and reads it. This handles entries that were uploaded before the extraction was added.

## Technical Details

### New Edge Function: `supabase/functions/extract-lore-text/index.ts`

```text
POST body: { entryId: string }

1. Fetch the world_lore_entries row to get storage_path, file_type
2. Download file from storage bucket "world-lore"
3. Extract text:
   - PDF: parse text content from the PDF binary
   - Other text types: decode as UTF-8
4. UPDATE world_lore_entries SET content = extractedText WHERE id = entryId
5. Return { success: true, contentLength: N }
```

For PDF extraction, we'll use a simple regex-based approach to pull text from PDF streams (works for most text PDFs), or use the `pdf-parse` compatible approach available in Deno. If the PDF is scanned/image-based, we'll note that limitation.

### Changes to `src/components/lore/LoreUploader.tsx`

- After `createMutation.mutateAsync(...)` returns for a file upload, call the extraction edge function
- Add a toast notification: "Processing document..." / "Document text extracted"

### Changes to `src/hooks/useWorldLore.ts`

- Add an `extractLoreText` mutation that calls the edge function and invalidates the cache

### Changes to `src/components/lore/LorekeeperChat.tsx`

- In `buildLoreContext`: if an entry has `storage_path` but empty `content`, fetch the public URL from storage and attempt to read it as text (for .txt/.md files as fallback)

### Changes to `src/components/lore/LoreEntryCard.tsx`

- Show a subtle "Processing..." badge when an entry has a `storage_path` but no `content` yet

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/extract-lore-text/index.ts` | Create |
| `src/hooks/useWorldLore.ts` | Add extraction mutation |
| `src/components/lore/LoreUploader.tsx` | Call extraction after upload |
| `src/components/lore/LorekeeperChat.tsx` | Fallback storage fetch in context builder |
| `src/components/lore/LoreEntryCard.tsx` | Processing indicator |

