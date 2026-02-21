

# Turn-Based Fragment Deciphering System

## Concept

Every piece of media uploaded to the world (documents, images, audio, notes) becomes a **Fragment** -- an encrypted, partially understood artifact. Instead of instantly processing and indexing everything, fragments are **deciphered incrementally** through player turns. Each "turn" reveals a batch of chunks, upgrading the fragment's certainty from `speculative` through `partial` to `confirmed`. The Lorekeeper's answers evolve from vague hints to precise knowledge as more fragments are deciphered.

## How It Works

```text
Upload Fragment
    |
    v
[sealed] -- 0 chunks revealed, Lorekeeper knows nothing
    |
    v  (Player spends a turn)
[speculative] -- 2 chunks revealed, vague hints
    |
    v  (Another turn)
[partial] -- 6 chunks revealed, useful but incomplete
    |
    v  (More turns)
[confirmed] -- all chunks revealed, full knowledge
```

### Turn Economy
- Each "Decipher" action reveals N chunks (default: 3)
- Players can choose WHICH fragment to spend a turn on
- Larger documents require more turns to fully decipher
- The Lorekeeper can only reference chunks that have been revealed

## Database Changes

### Extend `fragment_archive` table
Add columns to track deciphering progress:
- `total_chunks INTEGER DEFAULT 0` -- total chunks after initial text extraction
- `revealed_chunks INTEGER DEFAULT 0` -- how many have been embedded/revealed
- `lore_entry_id UUID REFERENCES world_lore_entries(id)` -- link to the source lore entry

### Extend `lore_embeddings` table
Add a column to track reveal state:
- `is_revealed BOOLEAN DEFAULT false` -- only revealed chunks appear in RAG results

### Update `match_lore_chunks` function
Add a `WHERE le.is_revealed = true` filter so the Lorekeeper can only reference deciphered knowledge.

## Processing Pipeline

### Phase 1: Upload (instant)
- File uploaded to `world-lore` bucket
- `world_lore_entries` row created
- Text extracted via `extract-lore-text` (existing)
- Text chunked client-side, ALL chunks inserted into `lore_embeddings` with `is_revealed = false`
- A `fragment_archive` row created with `total_chunks` set, `revealed_chunks = 0`, `certainty_level = 'sealed'`

### Phase 2: Decipher Turn (player action)
- Player clicks "Decipher" on a fragment card
- Client calls new edge function `decipher-fragment`
- Function reveals the next N chunks: sets `is_revealed = true` on the next batch, generates their embeddings
- Updates `fragment_archive.revealed_chunks` and recalculates `certainty_level`
- Returns the newly revealed chunk texts as a "discovery" preview

### Certainty Levels
| Level | Threshold | Lorekeeper Behavior |
|-------|-----------|-------------------|
| `sealed` | 0% revealed | "I sense something, but cannot read it yet." |
| `speculative` | 1-33% | Vague references, hedged language |
| `partial` | 34-66% | Useful but incomplete, gaps acknowledged |
| `confirmed` | 67-100% | Full confident knowledge |

## New Edge Function: `decipher-fragment`

Accepts `{ fragmentId, chunksToReveal?: number }`.

Steps:
1. Look up the fragment and its linked `lore_entry_id`
2. Find the next N unrevealed chunks (ordered by `chunk_index`)
3. Generate embeddings for each (via Gemini API)
4. Set `is_revealed = true` on those chunks
5. Update `fragment_archive.revealed_chunks` count and `certainty_level`
6. Return the revealed chunk texts + updated progress

## Frontend Changes

### New Component: `FragmentCard`
A card for the fragment list showing:
- Fragment title and type icon (document, image, audio, note)
- Progress bar: `revealed_chunks / total_chunks`
- Certainty badge (sealed/speculative/partial/confirmed) with color coding
- "Decipher" button that triggers one turn of chunk reveal
- Animated "reveal" effect when new chunks are deciphered

### Updated `WorldLore` page
- Add a third tab: "Fragments" alongside Chat and Neural Map
- Fragment list shows all media with their deciphering progress
- Clicking a fragment shows its revealed content preview
- The upload flow now creates a sealed fragment automatically

### Updated `LorekeeperChat`
- Modify `buildRAGContext` to only query revealed chunks (handled by DB function update)
- When certainty is low, prepend a system note: "Your knowledge of [title] is [speculative/partial] -- respond with appropriate uncertainty"
- Show certainty indicators on source citations: "Clarity and Chaos (partial, 45%)"

### Updated `LoreEntryCard`
- Replace static chunk count badge with a progress indicator
- Show certainty level as a colored badge
- Add "Decipher" button inline

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| Migration SQL | Create | Add columns to `fragment_archive` and `lore_embeddings`, update `match_lore_chunks` |
| `supabase/functions/decipher-fragment/index.ts` | Create | Turn-based chunk reveal + embedding |
| `src/hooks/useFragments.ts` | Create | React Query hooks for fragment CRUD and decipher mutations |
| `src/components/lore/FragmentCard.tsx` | Create | Fragment card with progress bar and decipher button |
| `src/pages/WorldLore.tsx` | Modify | Add Fragments tab, wire up decipher flow |
| `src/hooks/useWorldLore.ts` | Modify | Update extraction to create sealed fragments + insert unrevealed chunks |
| `src/components/lore/LorekeeperChat.tsx` | Modify | Add certainty-aware context injection |
| `src/components/lore/LoreEntryCard.tsx` | Modify | Show certainty + progress instead of static chunk count |

## Design Decisions

- **Embedding on reveal, not upload**: Chunks are stored as text on upload but only embedded when revealed. This saves API calls and makes the "decipher" action feel meaningful -- the knowledge literally becomes searchable.
- **Fragment-lore entry link**: Each fragment maps to a `world_lore_entries` row for content storage, keeping the existing lore infrastructure intact.
- **All media types**: Documents, images, audio, and notes all become fragments. For non-text media (images, audio), the "chunks" are AI-generated descriptions/transcriptions split into segments.
- **Certainty in RAG**: The `match_lore_chunks` function filters on `is_revealed = true`, so the system naturally constrains what the Lorekeeper knows without any client-side hacking.

