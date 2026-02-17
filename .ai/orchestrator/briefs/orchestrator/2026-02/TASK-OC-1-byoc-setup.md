# TASK-OC-1: BYOC Setup (Bring Your Own Claw)

**Sprint:** 2026-02-studio-game-alignment
**Target:** Local development environment (not a repo task)
**Agent:** Human/Ops
**Priority:** Wave 4 (first OC task)
**Depends on:** Nothing
**Blocks:** OC-2 (Webhook Bridge), OC-3 (SKILL.md Files)

---

## Goal

Install OpenClaw on local hardware (Mac or Samsung phone), connect to Kimi Claw web UI at kimi.com via BYOC flow, and create a test agent that proves the pipeline works.

## Context

Kimi Claw launched Feb 15, 2026 with BYOC (Bring Your Own Claw) — connect your local OpenClaw to Kimi Claw's cloud UI. This gives us local agent execution + cloud management dashboard + 5,000+ ClawHub skills.

Reference: [direction-shift-openclaw-integration.md](direction-shift-openclaw-integration.md)

## Deliverables

1. **OpenClaw installed and running locally** — via npm or the install script
2. **Connected to Kimi Claw** — BYOC flow at kimi.com shows the connected instance
3. **Test agent created** — simple system prompt, responds to manual prompts
4. **Webhook endpoint verified** — POST to the test agent returns a JSON response
5. **Setup documented** — ports, auth tokens, config paths written up in `Open-RPG/docs/openclaw-setup.md`

## Acceptance Criteria

- [ ] OpenClaw process running on localhost
- [ ] Kimi Claw UI at kimi.com shows the connected instance
- [ ] Test agent responds to "Hello" with a text response
- [ ] Webhook POST to the test agent returns a valid JSON response
- [ ] Setup documented with: install command, ports, config file locations, token storage

## Do

- Use BYOC mode (not hosted Kimi Claw agents)
- Set a strong webhook token for auth
- Test on the same machine the game server runs on
- Document the `openclaw.json` config for reference

## Don't

- Don't install untrusted ClawHub skills (ClawHavoc mitigation)
- Don't expose the webhook endpoint to the public internet
- Don't use Kimi Claw hosted agents (we need local control for game integration)
- Don't skip webhook auth token setup
