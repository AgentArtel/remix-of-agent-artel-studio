# Kimi RPG Studio

AI agent management studio for building, deploying, and managing AI-powered NPCs and game entities in a live RPGJS game world. Features a visual workflow editor, PicoClaw agent runtime integration, RAG-powered World Lore system, and real-time game data sync.

**Studio is one of three projects in the pico-rpg-studio monorepo** (game, Studio, PicoClaw). For the full stack and how they work together, see the [repository root README](../README.md) and [Project overview](../docs/PROJECT_OVERVIEW.md).

## Quick Start

```bash
# From the repo root (e.g. kimi-rpg), enter the studio directory
cd studio
npm install
npm run dev
```

The dev server starts on port 8080.

## What's in This Project

- **Agent Builder** — Create AI agents with personality, identity, LLM config, and skills. Deploy to the game world via PicoClaw or use as studio-internal assistants (like the Lorekeeper).
- **NPC Manager** — Configure game NPCs with spawn location, sprite, AI model, and behavior skills. Dynamic dropdowns populated from the live game server.
- **World Lore** — Upload documents as fragments that are deciphered turn-by-turn. RAG-powered Lorekeeper agent answers questions based on revealed knowledge.
- **Workflow Editor** — Node-based visual canvas for building AI workflows with triggers, AI agents, logic, and game actions.
- **Execution Engine** — Run workflows and track execution history with per-node status and results.
- **Game Registry** — Real-time sync of game runtime data (maps, sprites, spawn points) to Studio dropdowns.
- **Object Templates** — Define interactive game objects with custom actions.
- **Game Integration** — Real-time Supabase sync between Studio and RPGJS game server. Changes to NPCs propagate to the live game immediately.

## Tech Stack

React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + Edge Functions + Realtime), PicoClaw (Go agent runtime on Railway), RPGJS game server.

## Documentation

- **[AGENTS.md](AGENTS.md)** — Full technical documentation (architecture, database schema, edge functions, code style)
- **[docs/README.md](docs/README.md)** — Docs index (architecture, game integration, vision)
- **[.lovable/plan.md](.lovable/plan.md)** — Current roadmap and feature progress
- **[docs/game-integration/](docs/game-integration/)** — Game architecture and integration specs
- **[tasks/claude-code/](tasks/claude-code/)** — Task handoffs for implementation

## Multi-Agent Development

This project is developed collaboratively by multiple AI agents:

- **Lovable** — Frontend UI, Supabase migrations, React components
- **Claude Code** — Game server integration, PicoClaw deployment, edge function architecture
- **Cursor** — Game server TypeScript, RPGJS configuration

Each agent has task handoff files in their respective directories. The `.lovable/plan.md` serves as the shared roadmap.

## Deployment

The Studio frontend deploys via Lovable (push to GitHub -> auto-deploy). Edge functions deploy via `supabase functions deploy`. PicoClaw runs on Railway.

## Pushing Studio updates to Lovable

Studio lives in **two Git repos** with different layouts. Do not assume they are the same.

| Repo | Remote | Layout | Used for |
|------|--------|--------|----------|
| **pico-rpg-studio** | `origin` | Monorepo; Studio is in `studio/` | Development (this repo) |
| **remix-of-agent-artel-studio** | `lovable` | Studio app at **root** (no `studio/` folder) | Lovable agent; deploy target |

**Rule:** Pushing `origin main` only updates the monorepo. It does **not** update the repo Lovable deploys from. Always use a **pull request** to get Studio changes to Lovable — do not force-push to `main`; Lovable reviews and merges PRs.

1. From the **monorepo root** (parent of `studio/`), ensure the `lovable` remote exists:
   ```bash
   git remote add lovable https://github.com/AgentArtel/remix-of-agent-artel-studio.git   # if missing
   ```
2. Split the `studio/` subtree and push to a **branch** on Lovable (not main):
   ```bash
   git subtree split -P studio -b studio-for-lovable
   git push lovable studio-for-lovable:updates-for-lovable-review
   ```
3. Open a **pull request** on GitHub from that branch into `main` on [remix-of-agent-artel-studio](https://github.com/AgentArtel/remix-of-agent-artel-studio). Lovable reviews the PR and merges; after merge they deploy and run any Supabase updates.

Use a new branch name if you prefer (e.g. `studio-sync-YYYY-MM-DD`). See **.cursor/rules/lovable-deploy-sync.mdc** for the same workflow as a Cursor rule.
