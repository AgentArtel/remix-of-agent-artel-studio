# TASK-S-3: Dashboard Game Stats — Verify & Polish

**Sprint:** 2026-02-studio-game-alignment
**Target repo:** Agent-Artel-studio (Studio)
**Agent:** Lovable
**Status:** MERGED — verify against spec, fix bugs, polish UX

---

## Status

Dashboard game stats have been **built and merged to main**:

- `src/pages/Dashboard.tsx` — game stats section with 4 StatCards querying game schema
- Uses `gameDb()` with `Promise.all()` for parallel count queries
- Icons: Users (NPCs), MessageSquare (Messages), Puzzle (Integrations), Globe (Players)

All game queries use `gameDb()` with `{ count: 'exact', head: true }` for efficient count-only queries.

**This brief is NOT build-from-scratch. The task is: verify the merged stats display correct data from the live database, and fix any bugs or UX rough edges.**

---

## Verification Checklist

Test against the live Supabase database with seed data.

### Game Stats Cards
- [ ] **Active NPCs** shows correct count of enabled NPCs (should be 4 with seed data, all enabled)
- [ ] **Player Messages** shows count of `agent_memory` rows where `role = 'user'` (may be 0 if no conversations have happened)
- [ ] **API Integrations** shows count of enabled integrations (should be 1: Image Generation)
- [ ] **Online Players** shows count of `player_state` rows (may be 0 if no players have connected)
- [ ] All 4 cards render without console errors

### Data Accuracy
- [ ] After creating a new NPC (via NPC Builder) and returning to Dashboard, the "Active NPCs" count updates
- [ ] After disabling an NPC, the count decreases on Dashboard refresh
- [ ] After creating a new integration, "API Integrations" count updates

### Error Handling
- [ ] If game schema queries fail (e.g., Supabase down or schema not exposed), the dashboard still renders — game stats show 0 or a fallback, not a crash
- [ ] Studio stats section (workflows, executions, success rate, avg duration) is unaffected by game stat failures

### Schema Compliance
- [ ] All 4 game queries go through `gameDb()` — verify in code and Network tab
- [ ] Studio queries use default schema (no `.schema('game')` on `studio_*` tables) — already correct

### Visual/UX
- [ ] Game stats section is visually separated from the Studio stats section above it
- [ ] Cards use appropriate icons (Users, MessageSquare, Puzzle, Globe)
- [ ] Cards match the style of the Studio stats cards above

---

## Known Polish Opportunities

1. **No section heading for game stats** — the Studio stats and game stats are two rows of 4 cards with no label distinguishing them. Consider adding a subtle "Game" heading or divider above the game stats row.
2. **Game stats have no loading skeleton** — the Studio stats row shows skeletons while loading, but the game stats row just shows 0 until the query resolves. Consider adding independent loading state for the game stats row.
3. **No error state shown** — if `gameStats` query fails, cards show 0. A "Game stats unavailable" indicator would be clearer. Currently the query has no `onError` handler.
4. **Game stats don't auto-refresh** — React Query's default `staleTime` applies. Consider adding `refetchInterval: 30000` for live-ish monitoring.

---

## Acceptance Criteria

- [ ] All 4 game stat cards display correct counts from the live database.
- [ ] No console errors on the Dashboard.
- [ ] Counts update after mutations on the NPCs or Integrations pages.
- [ ] Section heading or divider between Studio and Game stats (polish item #1) — optional.
- [ ] Loading skeleton for game stats row (polish item #2) — optional.

## Reference

- Spec: `docs/game-integration/TASK-game-schema-integration.md` (section 4)
- Architecture: `docs/game-integration/VISION-studio-game-architecture.md` (Dashboard section)
