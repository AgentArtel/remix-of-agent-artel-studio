# TASK-OC-3: Custom SKILL.md Files for Game Skills

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Open-RPG (game) — files stored for version control
**Agent:** Cursor
**Priority:** Wave 4 (parallel with OC-2)
**Depends on:** OC-1 (need OpenClaw running to test)
**Blocks:** OC-4 (agent config needs skills installed)

---

## Goal

Write SKILL.md files that teach OpenClaw agents about the 6 game skills. These are the "vocabulary" that lets OpenClaw format action responses correctly in the webhook response.

## Context

Each game skill (say, move, look, emote, wait, generate_image) has a TypeScript implementation in `src/agents/skills/skills/`. The SKILL.md files mirror those parameter schemas in OpenClaw's format — YAML frontmatter + markdown instructions. They are NOT executed by OpenClaw; they teach the agent what actions it can request from the game.

Reference: [direction-shift-openclaw-integration.md](../../orchestrator/2026-02/direction-shift-openclaw-integration.md) — Section 5.

## Deliverables

1. **6 SKILL.md files** in `Open-RPG/openclaw/skills/`:

   | File | Maps to | Key Parameters |
   |------|---------|---------------|
   | `rpg-say/SKILL.md` | `say` skill | `message` (string, required), `target` (string, optional), `mode` (modal/bubble) |
   | `rpg-move/SKILL.md` | `move` skill | `direction` (up/down/left/right, required) |
   | `rpg-look/SKILL.md` | `look` skill | (none — returns perception snapshot) |
   | `rpg-emote/SKILL.md` | `emote` skill | `emotion` (happy/sad/angry/confused, required) |
   | `rpg-wait/SKILL.md` | `wait` skill | `duration` (number, ms, optional) |
   | `rpg-generate-image/SKILL.md` | `generate_image` skill | `prompt` (string, required) |

2. **Parameter schemas** match the existing skill parameter definitions in `src/agents/skills/skills/*.ts` exactly (same names, types, enums, required flags).

3. **Guidelines section** in each SKILL.md with character rules:
   - Keep messages under 200 characters
   - Stay in character at all times
   - Never use profanity, slurs, or explicit content
   - If provoked, deflect in character

4. **Installation script** — `Open-RPG/openclaw/install-skills.sh` that copies SKILL.md files to the OpenClaw agent's skill directory.

## Acceptance Criteria

- [ ] All 6 SKILL.md files written with correct YAML frontmatter
- [ ] Parameter schemas match game-side skill definitions exactly
- [ ] Each skill directory follows OpenClaw convention: `skill-name/SKILL.md`
- [ ] OpenClaw agent can load the skills (verify via Kimi Claw UI)
- [ ] Test agent with skills loaded produces correctly formatted action responses

## Do

- Match parameter names and types exactly to existing TypeScript skills
- Include enum values (emote types, speech modes) from game-side definitions
- Add usage guidelines that mirror the AgentRunner system prompt rules
- Follow OpenClaw SKILL.md format: YAML frontmatter + markdown body

## Don't

- Don't create skills for actions that don't exist game-side
- Don't include game-server URLs in the SKILL.md files (those are webhook config)
- Don't install ClawHub skills — these are all custom
- Don't add executable code to the SKILL.md files

## Reference

- Skill definitions: `src/agents/skills/skills/say.ts`, `move.ts`, `look.ts`, `emote.ts`, `wait.ts`, `generate-image.ts`
- Skill parameter types: `src/agents/skills/types.ts` (SkillParameterSchema)
- Plugin interface: `src/agents/skills/plugin.ts`
- OpenClaw SKILL.md format: https://docs.openclaw.ai/tools/skills
