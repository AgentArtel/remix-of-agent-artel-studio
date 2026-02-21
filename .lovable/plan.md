

# Lore Entry Detail View with Deciphering Progress

## Overview

Add a click-through detail view for lore entries accessible from the Game Dashboard's "Recent Lore" list. This view shows the completeness/progress of each entry based on how much data has been extracted and filled out. We also define structured TypeScript schemas for all supported media types using the existing `metadata` JSONB column (no database migration needed).

## Changes

### 1. New Component: `LoreEntryDetail` (`src/components/lore/LoreEntryDetail.tsx`)

A detail panel showing a single lore entry's full state with a visual progress indicator:

- **Header**: Title, type badge, file info (name, size, mime type)
- **Progress tracker**: Visual checklist showing which fields are populated:
  - Content extracted (content field filled)
  - Summary generated (summary field filled)
  - Tags assigned (tags array non-empty)
  - Chunks indexed (from lore_embeddings count)
  - Fragment created (linked fragment_archive row exists)
  - Fragment deciphered (revealed_chunks vs total_chunks)
  - Knowledge graph linked (metadata.graph_nodes present)
- **Media metadata section**: Type-specific metadata display (dimensions for images, page/word count for docs, duration for audio/video)
- **Content preview**: Truncated content or summary
- **Actions**: Navigate to World Lore chat with entry selected, trigger extraction, view linked fragment

### 2. Media Metadata Type Definitions (`src/types/loreMedia.ts`)

Define TypeScript interfaces for the structured metadata stored in the `metadata` JSONB column. No DB migration needed -- the column already exists.

```text
DocumentMeta    -- page_count, word_count, language, headings[]
ImageMeta       -- width, height, alt_text, scene_description, dominant_colors[]
AudioMeta       -- duration_seconds, transcript_status, speaker_count
VideoMeta       -- duration_seconds, frame_count, transcript_status
NoteMeta        -- source, category
```

A union type `LoreMediaMeta` with a `media_type` discriminator will let the detail view render type-specific fields.

### 3. Update `GameDashboard.tsx`

- Make Recent Lore items clickable with `cursor-pointer`
- Navigate to `lore-detail:<entryId>` on click
- Fetch slightly more data for Recent Lore (add `file_type`, `storage_path` to the select)

### 4. Update `App.tsx`

- Add `'lore-detail'` to the `Page` type union
- Add state for `loreDetailId`
- Parse `lore-detail:<id>` in `onNavigate`
- Render `LoreEntryDetail` for the `lore-detail` route, passing the entry ID and an `onNavigate` prop for back-navigation

### 5. Update `useWorldLore.ts`

- Add a `useWorldLoreEntry(id)` hook that fetches a single entry by ID with its chunk count and linked fragment data in parallel
- Reuse existing query patterns

### 6. Update Extract/Upload Pipeline

- When `extract-lore-text` returns results, populate `metadata` with media-specific fields (page count, word count, etc.) derived from the extracted content
- This happens in the existing `useExtractLoreText` mutation's `onSuccess` -- add an update call to write computed metadata back to the row

## Technical Details

### Files created
- `src/types/loreMedia.ts` -- TypeScript type definitions for media metadata
- `src/components/lore/LoreEntryDetail.tsx` -- Detail view component

### Files modified
- `src/App.tsx` -- Add lore-detail route
- `src/pages/GameDashboard.tsx` -- Make lore items clickable
- `src/hooks/useWorldLore.ts` -- Add single-entry hook, metadata update in extraction

### No database migration required
The `world_lore_entries.metadata` JSONB column already exists and can store all media-specific fields. We define the shape in TypeScript only.

### Progress calculation logic
Progress is computed as a percentage from these checkpoints:
1. File uploaded (storage_path exists) -- 15%
2. Content extracted (content not null) -- 25%
3. Summary generated (summary not null) -- 15%
4. Tags assigned (tags.length > 0) -- 10%
5. Chunks indexed (chunk count > 0) -- 15%
6. Fragment created (linked fragment exists) -- 10%
7. Fragment fully deciphered (revealed == total) -- 10%

Displayed as a segmented progress bar with labeled checkpoints.

