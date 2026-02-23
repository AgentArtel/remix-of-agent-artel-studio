# Kimi RPG Studio — Documentation

This folder holds architecture, game-integration specs, vision, and review documents. Use it to onboard or find the right doc for implementation.

## Where to start

- **[../AGENTS.md](../AGENTS.md)** — Canonical technical documentation: architecture, PicoClaw, database schema, edge functions, workflow nodes, code style. Start here for implementation details.

## Main docs

| Doc | Description |
|-----|-------------|
| [**AGENTS.md**](../AGENTS.md) | Full technical reference (single source of truth) |
| [**Project_Vision.md**](Project_Vision.md) | Current product vision: Kimi RPG Studio, PicoClaw, game-design workflows |
| [**game-integration/**](game-integration/) | Game architecture, NPC Builder spec, design workflows, Lovable prompts |
| [**architecture/**](architecture/) | System diagrams and diagram template (e.g. DIAGRAM-TEMPLATE.md) |
| [**PROJECT-REVIEW-2025-02-20.md**](PROJECT-REVIEW-2025-02-20.md) | Snapshot review of Studio codebase (Feb 2025) |
| [**archive/**](archive/) | Archived historical docs (e.g. earlier Agent Artel / OpenClaw vision) |

## Game integration

The [game-integration/](game-integration/) folder contains the canonical specs for wiring Studio to the game (kimi-rpg): shared database, NPC Builder, workflow steps as game-design units. See [game-integration/README.md](game-integration/README.md) for reading order and file purposes.
