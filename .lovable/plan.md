

# The Fragment Archivist - Infrastructure Setup

This plan sets up the database tables, storage, and skills needed for the Fragment Archivist to receive, catalog, and analyze media fragments from players.

---

## 1. Assign Existing Skills

The Archivist needs these skills from the existing skill library:

| Skill | Why |
|-------|-----|
| **Chat** (core) | Conversational fragment intake |
| **Memory** (core) | Remember previously analyzed fragments across sessions |
| **Sentiment Analysis** | Analyze tone/emotion in text fragments |

These will be linked via `picoclaw_agent_skills` inserts.

---

## 2. Create a Storage Bucket

A new Supabase Storage bucket called **`fragments`** will hold uploaded media (images, audio, video, notes). Public read access so the Archivist (via edge function) can retrieve files for analysis.

---

## 3. New Database Table: `fragment_archive`

This is the core catalog where analyzed fragments are stored.

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid (PK) | Unique fragment ID |
| `player_id` | text | Who found it |
| `title` | text | Short label |
| `fragment_type` | text | `audio`, `video`, `image`, `text`, `note` |
| `storage_path` | text (nullable) | Path in `fragments` bucket |
| `raw_content` | text (nullable) | Inline text content |
| `analysis` | jsonb | Archivist's interpretation |
| `tags` | jsonb | Array of categorization tags |
| `connections` | jsonb | Links to other fragment IDs |
| `certainty_level` | text | `confirmed`, `likely`, `speculative` |
| `is_processed` | boolean | Whether analysis is complete |
| `created_at` / `updated_at` | timestamptz | Timestamps |

RLS: permissive "Allow all" (matching current dev pattern).

---

## 4. Create Game Entity (agent_configs)

Insert a row into `agent_configs` so the Archivist has a game-world presence, then link it to the PicoClaw agent via `agent_config_id`.

---

## 5. New Custom Skill: "Fragment Analysis"

Insert a new skill into `picoclaw_skills`:

- **Name:** Fragment Analysis
- **Slug:** `fragment-analysis`
- **Category:** `analysis`
- **Tools:** `identify_fragment`, `analyze_fragment`, `cross_reference`, `catalog_fragment`
- **Description:** Identify, analyze, and catalog media fragments, cross-referencing with existing archive data.

Then assign it to the Archivist.

---

## Summary of Changes

| Type | What |
|------|------|
| **DB Migration** | Create `fragment_archive` table with RLS |
| **Storage** | Create `fragments` bucket |
| **Data Insert** | Assign 3 existing skills (Chat, Memory, Sentiment Analysis) |
| **Data Insert** | Create "Fragment Analysis" custom skill |
| **Data Insert** | Assign Fragment Analysis skill to agent |
| **Data Insert** | Create `agent_configs` game entity for the Archivist |
| **Data Update** | Link PicoClaw agent to the new game entity |

