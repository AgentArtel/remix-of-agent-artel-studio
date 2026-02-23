# Kimi RPG Studio — Project Vision

## The Short Version

**Kimi RPG Studio** is a visual workflow builder and AI agent management studio for creating, deploying, and managing AI-powered NPCs, game objects, and automation workflows. It integrates with a live RPGJS game via real-time Supabase sync and the **PicoClaw** AI agent runtime. You design agents and game systems in the studio; the game world and the backend are one integrated system.

---

## What We're Building

- **Visual Workflow Editor** — Node-based canvas (triggers, AI agents, logic, game actions) to design and run automation. Workflows can drive in-game events, RAG ingestion, and backend pipelines.

- **PicoClaw Agent Builder** — Create AI agents with personality (SOUL.md), identity, LLM config, and skills. Deploy them as game NPCs or as studio-internal agents (e.g. the Lorekeeper).

- **RPGJS Game Integration** — Studio and the game share the same Supabase database. NPC configs, object templates, and registry data (maps, sprites, spawn points) sync in real time. Changes in Studio propagate to the live game immediately.

- **World Lore & Fragments** — Upload documents as fragments; decipher them turn-by-turn through play. The Lorekeeper agent’s knowledge grows as fragments are revealed, powered by RAG over revealed chunks.

- **Game-Design Workflows** — We build the backend into the game and the game into the backend. Backend tasks are expressed as **game-design steps** (e.g. file → chunk/extract → altar → fragments → RAG). Each step has both an in-world design (who, where, what) and a backend implementation (APIs, DB, Edge Functions). The workflow graph in Studio is the spec for implementation.

---

## Technical Orientation

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui  
- **Backend:** Supabase (PostgreSQL, Edge Functions, Realtime, Storage)  
- **AI runtime:** PicoClaw (Go) on Railway; multiple LLM providers (Groq, Gemini, Kimi, OpenAI, Anthropic, DeepSeek)  
- **Game:** RPGJS 4.3 (TypeScript, Tiled maps) in the kimi-rpg repo  

For full architecture, database schema, and code style see **[AGENTS.md](../AGENTS.md)** and **[docs/game-integration/](game-integration/)**.
