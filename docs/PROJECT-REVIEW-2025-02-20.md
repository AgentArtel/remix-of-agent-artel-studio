# Project Review: Studio

**Date:** 2025-02-20  
**Scope:** kimi-rpg/studio codebase (read-only review).  
**Purpose:** Log findings for later follow-up; different task in progress today.

---

## 1. What This Project Is

**Studio** is a **web dashboard/studio** for the kimi-rpg ecosystem — not the RPG-JS game itself. It provides:

- A **workflow editor** (n8n-style visual editor with nodes) to design and run automation.
- Management of **NPCs**, **maps**, **object templates**, **credentials**, and **integrations**.
- Integration with **Supabase** (auth, DB, Edge Functions) and optional **n8n** via the `object-action` Edge Function.

The actual game runs in the parent **kimi-rpg** repo (RPG-JS); Studio is the tooling layer.

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Build | Vite 5.x |
| Language | TypeScript 5.x |
| UI | React 18, React Router 6 |
| UI Components | shadcn/ui (Radix), Tailwind CSS |
| Data / API | TanStack Query, Supabase (client) |
| Backend | Supabase (Auth, DB, Edge Functions) |
| Testing | Vitest, Testing Library |

---

## 3. Repository Structure (High Level)

- **`src/`** – Frontend: `pages/` (Dashboard, WorkflowList, WorkflowEditorPage, NPCs, MapBrowser, MapAgent, ObjectTemplates, ExecutionHistory, Credentials, Settings, PlayGame, etc.), `components/` (canvas, workflow, npcs, map-entities, UI), `hooks/` (e.g. `useExecution`), `lib/`, `contexts/`, `integrations/supabase/`.
- **`supabase/`** – Backend: `functions/` (object-action, object-api, npc-ai-chat, studio-run, workflow-scheduler), `migrations/` (workflow tables, n8n webhook registry, etc.).

---

## 4. Architecture Highlights

### Workflow Execution and Game Nodes

- **`src/hooks/useExecution.ts`** runs workflows: it computes execution order from the graph and dispatches each node via **`executeNodeByType`**.
- Real execution is implemented for **Gemini** (chat, embed, vision), **image-gen**, **memory**, **webhook**, **AI agent**, and **game nodes**: `game-show-text`, `game-give-item`, `game-give-gold`, `game-teleport`, `game-open-gui`, `game-set-variable`.
- For those game node types, execution calls the **`object-action`** Edge Function with `object_type`, `action`, `player_id`, `inputs`. The plan in **`.lovable/plan.md`** (wiring game nodes to object-action) is **already implemented** in `useExecution.ts` (approx. lines 395–444).

### object-action Edge Function

- **Role:** Proxy between Studio/game and n8n.
- **Flow:** Reads `object_type` and `action` from the body, builds `action_key` (e.g. `game.show-text`), looks up **`n8n_webhook_registry`**, then either POSTs to the registered n8n webhook (with configurable timeout, default 90s) or returns **`NO_WORKFLOW`** when no active webhook is registered.
- **Behavior:** CORS headers, structured JSON errors (`code`, `message`, `retryable`), timeout via `AbortController`, and `clearTimeout` in both success and error paths. File **`supabase/functions/object-action/index.ts`** was **modified** in git at review time (only uncommitted change).

### Data Model (from migrations)

- **`n8n_webhook_registry`** – `action_key`, `webhook_url`, `timeout_ms`, `is_active`, etc.; seeded with placeholders (e.g. mailbox, desk, studio.run_workflow).
- **`workflow_templates`** – User workflows with JSONB `steps` (object-action steps).
- **`workflow_schedules`** – Cron/interval/once schedules for templates.
- **`object_templates`** – e.g. Archivist, Butler.

---

## 5. Code Quality and Config

- **Linting:** No linter errors reported in `App.tsx` or `object-action/index.ts`.
- **TypeScript (`tsconfig.json`):** `noImplicitAny: false`, `strictNullChecks: false`, `noUnusedLocals: false`, `noUnusedParameters: false` — typing is permissive. Tightening these later would improve safety and refactorability.
- **App structure:** Routing is handled inside `App.tsx` via in-memory “page” state and sidebar. Only `/auth/callback` is a real route; everything else is a single `*` route that renders `AppContent` and switches pages by state. So the URL does not reflect the current page (e.g. Dashboard vs Workflows). If you want shareable/bookmarkable URLs, consider mapping pages to pathnames.
- **Auth:** Implemented in `AuthContext` with Supabase; in `App.tsx` the auth gate is **commented out** (“Auth gate disabled for development”), so the app is open without login. Re-enable for production.

---

## 6. Summary Table

| Aspect | Status / note |
|--------|----------------|
| Purpose | Studio dashboard for kimi-rpg: workflows, NPCs, maps, objects, integrations. |
| Stack | Vite, React, TypeScript, shadcn, Tailwind, Supabase. |
| Game node wiring | Implemented in `useExecution.ts` → `object-action` → n8n registry. |
| object-action | Clear proxy + timeout + NO_WORKFLOW; was modified in git at review time. |
| TypeScript strictness | Relaxed (no strict null checks, implicit any allowed). |
| Auth | Implemented but disabled for development. |
| Routing | Single catch-all route; pages not reflected in URL. |
| Docs | README is generic Lovable template; no Studio-specific AGENTS.md in this repo. |

---

## 7. Suggested Follow-ups (When Circling Back)

1. **Re-enable auth** in `App.tsx` when moving out of development.
2. **Consider URL-based routing** for main sections (e.g. `/workflows`, `/npcs`, `/maps`) so links and browser history match the UI.
3. **Optionally tighten TypeScript** over time (`strictNullChecks`, `noImplicitAny`) in a separate branch.
4. **Document Studio** in a short README or AGENTS.md (what it does, how it relates to the game and to object-action/n8n) for future you and contributors.
5. **Commit or revert** the current changes to `supabase/functions/object-action/index.ts` so the repo state is clear.

---

*End of review. Circle back when ready to act on these findings.*
