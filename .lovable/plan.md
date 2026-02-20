

## Create PicoClaw Database Tables

### Problem
The build fails because `usePicoClawAgents.ts` references three tables that don't exist in Supabase: `picoclaw_agents`, `picoclaw_skills`, and `picoclaw_agent_skills`.

### Solution
Create a single database migration with all three tables, matching the TypeScript interfaces exactly.

### Tables

**picoclaw_agents** -- stores agent configurations for the PicoClaw agent builder

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid (PK) | gen_random_uuid() | |
| agent_config_id | text | NULL | optional link to agent_configs |
| picoclaw_agent_id | text, NOT NULL | | unique agent slug |
| soul_md | text | '' | SOUL.md content |
| identity_md | text | '' | IDENTITY.md content |
| user_md | text | '' | USER.md content |
| agents_md | text | '' | AGENTS.md content |
| llm_backend | text | 'openai' | |
| llm_model | text | 'gpt-4' | |
| fallback_models | jsonb | '[]' | array of model strings |
| temperature | numeric | 0.7 | |
| max_tokens | integer | 4096 | |
| max_tool_iterations | integer | 10 | |
| memory_enabled | boolean | true | |
| long_term_memory_enabled | boolean | false | |
| channel | text | NULL | |
| guild_id | text | NULL | |
| parent_agent_id | text | NULL | |
| allowed_subagents | jsonb | '[]' | |
| heartbeat_interval_seconds | integer | NULL | |
| cron_schedules | jsonb | '[]' | |
| deployment_status | text | 'draft' | draft/running/stopped/error |
| last_deployed_at | timestamptz | NULL | |
| last_error | text | NULL | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**picoclaw_skills** -- catalog of available skills

| Column | Type | Default |
|--------|------|---------|
| id | uuid (PK) | gen_random_uuid() |
| name | text, NOT NULL | |
| slug | text, NOT NULL, UNIQUE | |
| description | text | '' |
| skill_md | text | '' |
| tools | jsonb | '[]' |
| category | text | 'general' |
| is_builtin | boolean | false |
| created_at | timestamptz | now() |

**picoclaw_agent_skills** -- junction table

| Column | Type | Default |
|--------|------|---------|
| agent_id | uuid (FK -> picoclaw_agents) | |
| skill_id | uuid (FK -> picoclaw_skills) | |
| config_overrides | jsonb | '{}' |
| PRIMARY KEY | (agent_id, skill_id) | |

### RLS Policies
All three tables get a permissive "allow all" policy (matching the pattern used by other tables like `agent_configs`, `studio_workflows`, etc. in this project -- no auth is enforced).

### After Migration
The Supabase types will regenerate automatically, resolving all 13 TypeScript errors and unblocking the build.

### Technical Details

Single migration SQL covering:
1. CREATE TABLE for all 3 tables with columns, defaults, and constraints
2. Enable RLS on all 3 tables
3. Create "Allow all" policies for SELECT/INSERT/UPDATE/DELETE on each table
4. Cascade delete on the junction table foreign keys

No code changes needed -- the existing `usePicoClawAgents.ts` hook already matches this schema.

