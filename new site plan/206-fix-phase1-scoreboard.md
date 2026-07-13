# THE 206 FIX — Phase 1 Spec: The Scoreboard

The daily-return hook and the biggest single build. This is the Sports Hub merge. It fills the RibbonSlot reserved in Phase 0 and powers the `/scores` page.

Read this whole spec, then give a build plan before writing code.

---

## 1. Goal & scope

- Live scores + next-game + offseason state for all seven teams, refreshing on their own.
- Two surfaces: the **RibbonSlot** (thin one-line-per-team strip in the shared shell, every page) and the **`/scores` page** (fuller board + standings).
- Data from ESPN's unofficial JSON endpoints (same source the old Sports Hub used).

Out of scope for Phase 1: the uniform notification (see address-later list), deep historical stats.

---

## 2. Architecture fit (important)

The site is SSG (vite-react-ssg): content pages prerender to static HTML. **The scoreboard is the exception.** Scores are live, so they must NOT be baked at build. Build the RibbonSlot and the `/scores` board as **client-hydrated islands**: the prerendered HTML ships a skeleton/loading state, then the component fetches live data on mount and hydrates.

ESPN's `site.api.espn.com` endpoints send permissive CORS and are callable directly from the browser (that's why the old Sports Hub worked client-side with no backend). So fetch client-side to start. Only introduce a serverless proxy later if rate-limiting ever becomes a problem; don't build one pre-emptively.

**Isolate the fetch + normalize layer in one module.** ESPN's API is undocumented and can change without notice. Everything that knows ESPN's response shape lives in one file, so an endpoint change is a one-file fix, never a site-wide hunt.

---

## 3. Data source: ESPN endpoints

### Stable endpoint patterns (confident)
- League scoreboard: `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard`
- Team schedule: `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{teamId}/schedule`
- Team info (record + standingSummary): `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{teamId}`
- All teams in a league: `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams`

### Sport/league slugs (confident)
| Team | sport | league |
|---|---|---|
| Mariners | baseball | mlb |
| Seahawks | football | nfl |
| Kraken | hockey | nhl |
| Storm | basketball | wnba |
| Sounders | soccer | usa.1 (MLS) |
| Reign | soccer | usa.nwsl (NWSL) |
| Sonics | — | — (no live team; see §5) |

Soccer scoreboards are league-wide; filter events for the Seattle club, or use the team schedule endpoint.

### Team IDs — DO NOT trust, RESOLVE them
I'm not giving you hardcoded team IDs because stale IDs are a silent-failure trap. Instead, **resolve each team's ID at build/dev time**: hit the `.../teams` endpoint for each league, find the Seattle club by name, and capture its `id` and `abbreviation` into your config. Log what you resolved so it's auditable. Verify each resolved ID returns the right team before wiring it in.

---

## 4. Data model

Normalize every team to one shape, regardless of sport, so the UI never contains sport-specific logic:

```ts
type TeamKey = 'mariners'|'seahawks'|'kraken'|'sonics'|'sounders'|'storm'|'reign';
type GameStatus = 'live'|'final'|'scheduled'|'offseason'|'returning'|'unavailable';

interface TeamScore {
  key: TeamKey;
  displayName: string;        // "Mariners"
  status: GameStatus;
  opponent?: string;          // "Rangers"
  teamScore?: number;
  oppScore?: number;
  detail?: string;            // "Bot 7" | "Final" | "Sun 1:10 PM" | "Camp Jul 22"
  isHome?: boolean;
  startDate?: string;         // ISO
  series?: { summary: string; results: ('W'|'L')[] };  // playoffs only
  logoUrl?: string;           // ESPN provides these (see §12)
  updatedAt: string;          // ISO
}
```

Drive the whole feature from a **config array**, one entry per team, so adding a team later (returning Sonics, a future AUSL Seattle side) is a one-line change:

```ts
interface TeamConfig {
  key: TeamKey;
  displayName: string;
  sport: string;              // 'baseball' | 'soccer' | ...
  league: string;             // 'mlb' | 'usa.1' | ...
  espnTeamId?: string;        // resolved per §3
  kind: 'live' | 'returning';
  offseasonCopy?: string;     // fallback when no game is near
}
```

---

## 5. States every tile MUST handle (the no-blank rule)

A tile never renders empty and never crashes. Map each to `status`:

- **live** — score + live clock/inning + LIVE indicator. (`status.type.state === 'in'`)
- **final** — FINAL + score, for a recent game (within ~48h). (`state === 'post'`)
- **scheduled** — "NEXT: {day time} vs {opp}" when the next game is near. (`state === 'pre'`)
- **offseason** — no game within the near window: show `offseasonCopy` or a countdown to the next known event (e.g. "CAMP JUL 22", "OFFSEASON · Next Oct 8"). Never blank.
- **returning** — the **Sonics** special case. No ESPN feed exists. Render a fixed tile ("SONICS · EST. 1967" / return-watch line) from config, `kind: 'returning'`. When the franchise becomes real, flip config to `kind: 'live'` and give it a league/ID. No other code changes.
- **unavailable** — fetch failed or shape unexpected: show "Score unavailable," keep the team name and mark visible. Never a crash, never a blank.

Offseason detection: pick the team's relevant event from the schedule (in-progress > most-recent-final-within-48h > next-scheduled). If the next scheduled event is beyond ~10 days out or absent, treat as offseason and show copy/countdown.

---

## 6. Two surfaces

**RibbonSlot** (fills the Phase 0 reserved slot, shared shell, every page): one compact line per team, terminal font, LIVE in red (already sized to match team names per the mockup). This is the always-present daily hook. Horizontal, scrollable on narrow screens.

**`/scores` page** (the SCORES nav destination): the fuller board — larger per-team tiles with the same normalized data — plus standings below (§8). Rename the route from `/standings` to `/scores` so the URL matches the nav label and the higher-search term. Keep the scoreboard leading, standings beneath.

Both surfaces read the same normalized `TeamScore[]` from one shared hook/store, so they never fetch twice or drift. Fetch once, render in both.

---

## 7. Live polling & refresh

- Fetch all teams on mount.
- **Poll only when at least one team is `live`.** Interval ~30–60s. No live games = no polling.
- Pause polling when the tab is hidden (Page Visibility API); resume on focus.
- Clear intervals on unmount.
- Cache responses briefly (short in-memory TTL) so the ribbon and the `/scores` board don't double-hit ESPN on the same load.

This keeps you gentle on an undocumented endpoint and easy on the user's battery.

---

## 8. Standings (on `/scores`, lower priority than scores)

Two tiers, pick based on what verifies cleanly:

- **Compact (easy win):** the team info endpoint often returns `record` and a `standingSummary` string ("2nd in AL West"). A one-line standing per team is cheap and reliable. Do this first.
- **Full table:** `https://site.api.espn.com/apis/v2/sports/{sport}/{league}/standings` — more finicky and inconsistent across leagues. Acceptable to defer the full table to a follow-up within Phase 1 if it fights you. Scores are the priority; don't let standings block the board.

---

## 9. Series / playoff tracker

- During a playoff series, show a W/L bubble strip (the element from the Seattle Times reference).
- Source: the chosen event's `competition.series` when present; otherwise omit entirely.
- **Playoff-only and optional.** If it's fiddly, ship the board without it and add it as a follow-up. It must never block or break a normal-season tile.

---

## 10. Resilience checklist

- One isolated fetch/normalize module; UI never sees raw ESPN shapes.
- Per-team failure is contained: one team erroring shows that tile as `unavailable`, the other six render fine.
- Timeouts on every fetch; no hanging requests.
- Defensive parsing: optional-chain everything; a missing field yields `unavailable`, not a throw.
- Log resolved IDs and any endpoint that returns an unexpected shape.

---

## 11. Verification before calling Phase 1 done

- All seven tiles render in every applicable state (force each state to confirm; e.g. mock an offseason team, a live game, a final).
- Sonics shows the returning tile, fed from config, no failed fetch.
- RibbonSlot and `/scores` show consistent data from one fetch.
- Polling starts only with a live game, pauses on hidden tab, stops on unmount.
- `/scores` resolves via clean URL; old `/standings` redirects or is retired.
- Typecheck clean, build green, prerendered routes intact (the board hydrates client-side over a static skeleton).
- Checked on the live Vercel preview, desktop and phone.

---

## 12. What NOT to do

- **Don't hardcode unverified team IDs.** Resolve them (§3).
- **Don't prerender scores.** They're a client island over a static skeleton (§2).
- **Don't over-poll.** Live games only, paused when hidden (§7).
- **Logos:** ESPN's responses include team logo URLs. Using them is consistent with the logo decision already made (editorial use, tolerated grey area, swap if a league ever objects). Fine to use the ESPN-provided logo URLs for the tiles. Do not build custom art.
- **Don't let one team's failure sink the board** (§10).

---

## Session kickoff prompt

```
Reference the "new site plan" folder. We're on Phase 1 — the scoreboard — per
206-fix-phase1-scoreboard.md. Read that spec in full, and check the shell/RibbonSlot
from Phase 0.

Constraints:
- Phase 1 only. Build on a fresh branch off main. Don't merge until I review a preview.
- Client-hydrated island over a static skeleton; do NOT prerender live scores.
- Resolve ESPN team IDs by querying the teams endpoints; do not hardcode them.
- Config-driven, one entry per team; Sonics is kind:'returning' (no feed).
- Isolate all ESPN-shape logic in one fetch/normalize module.

Before writing code: give me your plan — the config shape, the endpoints you'll hit,
how you'll resolve IDs, the normalized data model, and how the RibbonSlot and /scores
share one fetch. Wait for my go-ahead.
```
