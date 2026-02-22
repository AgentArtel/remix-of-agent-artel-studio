# Game Design Workflows — Backend and Game as One System

> **Purpose:** Canonical explanation of how we use the Studio workflow builder for game development: backend and game are built together, and we break backend work into **game-design steps** that can be drawn, shared, and implemented from the graph.
>
> **Audience:** Anyone working on Studio or the game (humans and AI). Point to this doc when you need context on why a "game design" view exists, what sprints vs steps mean, or how workflows relate to implementation.

---

## Core idea: backend into the game, game into the backend

We are **not** building "a game that calls a backend" and "a backend that serves the game" as two separate products. We are building **one system** where:

- **The game** is the runtime: NPCs, objects, places, player actions, items, dialogs.
- **The backend** is the logic that runs when those things happen: storage, RAG, extraction, fragments, APIs, database updates.

Storage, RAG, extraction, fragments, NPCs, altar, items — they are the same flow. The "backend" is the logic that runs when the player does something in the world; the "game" is that same flow expressed as places, items, and NPCs. So we are **building the backend into the game and the game into the backend**.

---

## Sprints vs steps

We break work into two levels:

### Sprints = end-to-end features

A **sprint** is a full capability or feature. Example:

- **Sprint:** "Uploading and processing files into a RAG database"

That sprint covers: upload → store → extract/chunk → fragments → player journey (e.g. to altar and back) → RAG ingest.

### Steps = game-design units (what we draw in Studio)

A **step** is one piece of that flow that we can **design visually** and **hand off for implementation**. Each step is both:

- **Game design:** who does what, where (NPC, altar, item, dialog), and  
- **Backend:** which APIs, tables, and services run.

Example — one sprint broken into steps:

1. **Step 1 (NPC + file):** Set up a game action where we get the id of a file in storage and pass that id to an agent who performs chunking and extraction, updates the file row, and prompts the player to take the "item" to the Arcanum (altar) and bring back the fragments.
2. **Step 2 (Altar):** Player takes the file id to the altar and passes it; an AI agent takes files that have been extracted and chunked, turns them into fragments, adds them to the fragments database, and returns to the player a number of fragment types.
3. **Step 3 (NPC + RAG):** Player takes the fragments back to the previous AI-NPC and gives them the fragments; that NPC processes them and adds them to the RAG database.

Each step is a **game-design unit**: it has a clear in-world meaning (who, where, what item) and a clear backend meaning (which Edge Functions, tables, and data flow).

---

## How the Studio fits

- **Game-design view and nodes** in the workflow builder are the **language** for those steps. We are not drawing "generic automation"; we are drawing **steps in a sprint** — triggers, lore file, chunk/extract, altar, fragments, RAG ingest, player prompts.
- **One workflow** can represent one step or a short chain of steps; a **sprint** might be several workflows or one larger workflow split into clear phases.
- **Sharing with an agent or team** means: "Here is the step (and maybe the whole sprint) as a graph; implement the backend and game wiring for this." The graph is the **spec** for both in-world behavior and backend logic.
- Workflows can be **design-only** at first (no execution). Once the design is saved, it can be used to implement the backend; later we can make the same workflows executable or trigger a cloud agent to generate code from the graph.

---

## Why this lives in docs

This explanation is the **canonical context** so that:

- You don't have to re-explain how backend and game relate every time.
- Anyone (human or AI) working on Studio or the game can read this and understand why we have a game-design view, what "steps" and "sprints" mean, and how workflow graphs are used as specs for implementation.

**See also:**

- **VISION-studio-game-architecture.md** — What the game is, what Studio is, shared database, token economy.
- **AGENTS.md** — Project overview, structure, and "Game design workflows" section.
