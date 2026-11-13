/*
 * The ONLY module that understands ESPN's response shapes (spec §2, §10).
 *
 * ESPN's site.api.espn.com endpoints are undocumented and can change without
 * notice, so every field access is optional-chained and every failure path
 * yields a `status:'unavailable'` (or `offseason`) tile — this layer never
 * throws to its callers. The UI consumes only the normalized `TeamScore` /
 * `TeamStanding` shapes below and never sees a raw ESPN object.
 *
 * Endpoints (all permissive-CORS, callable straight from the browser):
 *   schedule:  site.api.../{sport}/{league}/teams/{id}/schedule → live/final/next
 *   standings: site.web.api.../{sport}/{league}/standings       → league tables
 *   box score: site.api.../{sport}/{league}/summary?event={id}  → one game
 *
 * (The per-team `.../teams/{id}` info endpoint used to supply a one-line record
 * but is blocked cross-origin from the browser, so it was dropped.)
 */

import { TEAMS, type Team, type TeamKey } from './teams';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';

/** `${sport}/${league}:${espnTeamId}` for every Seattle club — to flag "ours". */
const TEAMS_ESPN_IDS = new Set(
  TEAMS.filter((t) => t.espnTeamId).map((t) => `${t.sport}/${t.league}:${t.espnTeamId}`),
);

const TIMEOUT_MS = 10_000;
const RECENT_FINAL_MS = 48 * 60 * 60 * 1000; // a "recent" final: within ~48h
const NEAR_MS = 10 * 24 * 60 * 60 * 1000; // "next game is near": within ~10 days

// ─── Normalized shapes the rest of the app consumes (spec §4) ───────────────

export type GameStatus =
  | 'live'
  | 'final'
  | 'scheduled'
  | 'offseason'
  | 'returning'
  | 'unavailable';

/**
 * Extra in-game detail for the arena boards. Every field is optional: ESPN
 * fills them in sport by sport and only while a game is on, and a board shows
 * a dark (unlit) cell for anything that is missing rather than a made-up value.
 */
export interface LiveSituation {
  period?: number; // inning | quarter | period
  clock?: string; // "4:12" (hockey / football)
  halftime?: boolean;
  half?: 'top' | 'bot' | 'mid' | 'end'; // baseball
  balls?: number;
  strikes?: number;
  outs?: number;
  down?: number;
  distance?: number;
  downText?: string; // "2nd & 7"
  spot?: string; // "SEA 35"
  ball?: 'ours' | 'opp'; // football possession
  timeoutsOurs?: number;
  timeoutsOpp?: number;
  linesOurs?: string[]; // per-inning runs
  linesOpp?: string[];
}

export interface TeamScore {
  key: TeamKey;
  displayName: string;
  status: GameStatus;
  opponent?: string;
  teamScore?: number;
  oppScore?: number;
  detail?: string; // "Bot 7" | "Final" | "Sun 1:10 PM" | "Offseason · Next Oct 8"
  isHome?: boolean;
  startDate?: string; // ISO
  series?: { summary: string; results: ('W' | 'L')[] }; // playoffs only
  logoUrl?: string;
  eventId?: string; // ESPN event id — only set for live/final, i.e. when a box score exists
  live?: LiveSituation; // in-game detail for the arena boards (live, or a baseball final)
  updatedAt: string; // ISO
}

// ─── League standings (full tables) ─────────────────────────────────────────

export interface StandingsRow {
  teamId: string;
  name: string; // "Seattle Mariners"
  abbr?: string; // ESPN's own abbreviation (ours is flagged separately)
  logoUrl?: string;
  ours: boolean; // the Seattle club — highlighted by the table
  cells: string[]; // aligned with LeagueStandings.columns
}

export interface StandingsGroup {
  name: string; // "AL West" | "Western Conference"
  rows: StandingsRow[];
}

export interface LeagueStandings {
  key: string; // `${sport}/${league}`
  status: 'ok' | 'unavailable';
  season?: string; // "2026"
  columns: string[]; // header labels, e.g. ['W','L','PCT','GB','STRK']
  groups: StandingsGroup[];
  updatedAt: string; // ISO
}

// ─── Fetch helper ───────────────────────────────────────────────────────────

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Score fetch + normalize ────────────────────────────────────────────────

/** One event from the schedule, reduced to the fields a tile needs. */
interface ParsedEvent {
  id: string;
  state: string; // 'pre' | 'in' | 'post'
  startDate: string; // ISO
  dateMs: number;
  shortDetail?: string; // "Bot 7th" | "Final/10" | "7/15 - 7:10 PM PDT"
  oppName?: string;
  teamScore?: number;
  oppScore?: number;
  isHome: boolean;
  won?: boolean; // ESPN's own winner flags: the only honest answer after a shootout,
  oppWon?: boolean; // and both are false on a draw, so a flag alone can't mean "lost"
  logoUrl?: string;
  series?: { summary: string; results: ('W' | 'L')[] };
}

function parseScore(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const v =
    typeof raw === 'object'
      ? (raw as { value?: unknown; displayValue?: unknown }).value ??
        (raw as { displayValue?: unknown }).displayValue
      : raw;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseEvent(ev: any, team: Team): ParsedEvent | null {
  const comp = ev?.competitions?.[0];
  if (!comp) return null;

  const competitors: any[] = Array.isArray(comp.competitors) ? comp.competitors : [];
  const ours = competitors.find((c) => String(c?.team?.id) === String(team.espnTeamId));
  const opp = competitors.find((c) => c !== ours);

  const state: string | undefined = comp?.status?.type?.state;
  const startDate: string | undefined = comp?.date ?? ev?.date;
  const dateMs = startDate ? Date.parse(startDate) : NaN;
  if (!state || !startDate || !Number.isFinite(dateMs)) return null;

  const summary: string | undefined = comp?.series?.summary;

  return {
    id: String(ev?.id ?? comp?.id ?? `${startDate}`),
    state,
    startDate,
    dateMs,
    shortDetail: comp?.status?.type?.shortDetail ?? comp?.status?.type?.detail,
    oppName:
      opp?.team?.shortDisplayName ?? opp?.team?.name ?? opp?.team?.displayName,
    teamScore: parseScore(ours?.score),
    oppScore: parseScore(opp?.score),
    isHome: ours?.homeAway === 'home',
    won: typeof ours?.winner === 'boolean' ? ours.winner : undefined,
    oppWon: typeof opp?.winner === 'boolean' ? opp.winner : undefined,
    logoUrl: ours?.team?.logo ?? ours?.team?.logos?.[0]?.href,
    series: summary ? { summary, results: [] } : undefined,
  };
}

/**
 * Pick the one event that matters, and with it the status (spec §5):
 * in-progress > most-recent-final-within-48h > next-scheduled.
 * If the next game is beyond the ~10-day window (or there's none), it's the
 * offseason — but we still hand back that far-future event so the tile can show
 * a countdown ("Offseason · Next Oct 8").
 */
function chooseEvent(parsed: ParsedEvent[]): {
  status: GameStatus;
  event?: ParsedEvent;
} {
  const live = parsed.find((p) => p.state === 'in');
  if (live) return { status: 'live', event: live };

  const now = Date.now();

  const finals = parsed
    .filter((p) => p.state === 'post' && now - p.dateMs >= 0 && now - p.dateMs <= RECENT_FINAL_MS)
    .sort((a, b) => b.dateMs - a.dateMs);
  if (finals[0]) return { status: 'final', event: finals[0] };

  const next = parsed
    .filter((p) => p.state === 'pre' && p.dateMs >= now)
    .sort((a, b) => a.dateMs - b.dateMs)[0];

  if (next && next.dateMs - now <= NEAR_MS) return { status: 'scheduled', event: next };
  return { status: 'offseason', event: next };
}

function fmtScheduled(iso: string): string {
  // Client-side island → the user's local timezone is exactly what we want.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Scheduled';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function build(team: Team, status: GameStatus, ev?: ParsedEvent): TeamScore {
  const base: TeamScore = {
    key: team.id,
    displayName: team.name,
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === 'offseason') {
    return {
      ...base,
      startDate: ev?.startDate,
      detail: ev
        ? `Offseason · Next ${fmtShort(ev.startDate)}`
        : team.offseasonCopy ?? 'Offseason',
    };
  }

  if (!ev) return { ...base, status: 'offseason', detail: team.offseasonCopy ?? 'Offseason' };

  const detail =
    status === 'scheduled'
      ? fmtScheduled(ev.startDate)
      : status === 'final'
        ? ev.shortDetail ?? 'Final'
        : ev.shortDetail ?? 'Live';

  return {
    ...base,
    opponent: ev.oppName,
    teamScore: ev.teamScore,
    oppScore: ev.oppScore,
    detail,
    isHome: ev.isHome,
    startDate: ev.startDate,
    series: ev.series,
    logoUrl: ev.logoUrl,
    eventId: status === 'live' || status === 'final' ? ev.id : undefined,
  };
}

function unavailable(team: Team): TeamScore {
  return {
    key: team.id,
    displayName: team.name,
    status: 'unavailable',
    detail: 'Score unavailable',
    updatedAt: new Date().toISOString(),
  };
}

/** Fetch + parse one team's schedule. `fixture` selects the forward view. */
async function fetchScheduleEvents(team: Team, fixture: boolean): Promise<ParsedEvent[]> {
  const q = fixture ? '?fixture=true' : '';
  const url = `${SITE}/${team.sport}/${team.league}/teams/${team.espnTeamId}/schedule${q}`;
  const data: any = await getJson(url);
  const events: any[] = Array.isArray(data?.events) ? data.events : [];
  return events.map((e) => parseEvent(e, team)).filter((p): p is ParsedEvent => p !== null);
}

function dedupe(events: ParsedEvent[]): ParsedEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)));
}

const intOf = (v: unknown): number | undefined => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

/**
 * In-game detail for one live game (or a finished baseball game's line score).
 * The scoreboard endpoint carries the live `situation` (count, down and
 * distance, possession, timeouts); the summary endpoint is the fallback and
 * the source for a finished game's per-inning runs. Never throws: any miss
 * resolves to undefined and the board simply shows less.
 */
async function fetchSituation(team: Team, eventId: string, live: boolean): Promise<LiveSituation | undefined> {
  try {
    let comp: any;
    let sit: any;
    if (live) {
      const d: any = await getJson(`${SITE}/${team.sport}/${team.league}/scoreboard`);
      const ev = (Array.isArray(d?.events) ? d.events : []).find((e: any) => String(e?.id) === eventId);
      comp = ev?.competitions?.[0];
      sit = comp?.situation;
    }
    if (!comp) {
      const d: any = await getJson(`${SITE}/${team.sport}/${team.league}/summary?event=${encodeURIComponent(eventId)}`);
      comp = d?.header?.competitions?.[0];
      sit = comp?.situation ?? d?.situation;
    }
    const competitors: any[] = Array.isArray(comp?.competitors) ? comp.competitors : [];
    const ours = competitors.find((c) => String(c?.team?.id) === String(team.espnTeamId));
    const opp = competitors.find((c) => c !== ours);
    if (!ours || !opp) return undefined;

    const status = comp?.status ?? {};
    const detail = String(status?.type?.shortDetail ?? '').toLowerCase();
    const half: LiveSituation['half'] = /^top/.test(detail)
      ? 'top'
      : /^(bot|bottom)/.test(detail)
        ? 'bot'
        : /^mid/.test(detail)
          ? 'mid'
          : /^end/.test(detail)
            ? 'end'
            : undefined;

    const lines = (c: any): string[] | undefined =>
      Array.isArray(c?.linescores)
        ? c.linescores.map((l: any) => String(l?.displayValue ?? l?.value ?? ''))
        : undefined;

    const oursHome = ours?.homeAway === 'home';
    const poss = sit?.possession != null ? String(sit.possession) : undefined;
    const ball: LiveSituation['ball'] =
      poss != null
        ? poss === String(ours?.team?.id)
          ? 'ours'
          : poss === String(opp?.team?.id)
            ? 'opp'
            : undefined
        : ours?.possession === true
          ? 'ours'
          : opp?.possession === true
            ? 'opp'
            : undefined;

    const down = intOf(sit?.down);
    const distance = intOf(sit?.distance);
    const downText: string | undefined =
      sit?.shortDownDistanceText ??
      (down != null && down > 0 && distance != null ? `${ORD[down] ?? down} & ${distance}` : undefined);
    const spotRaw: string | undefined = sit?.possessionText ?? sit?.downDistanceText;
    const spot = spotRaw && / at /i.test(spotRaw) ? spotRaw.split(/ at /i).pop() : undefined;

    return {
      period: intOf(status?.period),
      clock: typeof status?.displayClock === 'string' ? status.displayClock : undefined,
      halftime: /halftime/i.test(String(status?.type?.name ?? '')) || /half/i.test(detail),
      half,
      balls: intOf(sit?.balls),
      strikes: intOf(sit?.strikes),
      outs: intOf(sit?.outs),
      down,
      distance,
      downText,
      spot,
      ball,
      timeoutsOurs: intOf(oursHome ? sit?.homeTimeouts : sit?.awayTimeouts),
      timeoutsOpp: intOf(oursHome ? sit?.awayTimeouts : sit?.homeTimeouts),
      linesOurs: lines(ours),
      linesOpp: lines(opp),
    };
  } catch {
    return undefined;
  }
}

const ORD: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th' };

/**
 * Normalized score for one team. Never throws: a returning team short-circuits
 * with no fetch, and any fetch/parse failure resolves to an `unavailable` tile
 * so one bad team can't sink the board (spec §5, §10).
 */
export async function fetchTeamScore(team: Team): Promise<TeamScore> {
  if (team.kind === 'returning') {
    return {
      key: team.id,
      displayName: team.name,
      status: 'returning',
      detail: team.offseasonCopy ?? `${team.name.toUpperCase()} · RETURNING`,
      updatedAt: new Date().toISOString(),
    };
  }

  if (!team.espnTeamId) return unavailable(team);

  try {
    const parsed = await fetchScheduleEvents(team, false);
    let chosen = chooseEvent(parsed);

    // Some leagues (notably soccer) return a stale base schedule with no
    // upcoming games; the ?fixture=true view holds the forward schedule. Only
    // reach for it when the base view shows nothing current, to stay gentle on
    // the endpoint (spec §7). A fixture failure just keeps the base result.
    if (chosen.status === 'offseason') {
      try {
        const fixture = await fetchScheduleEvents(team, true);
        if (fixture.length) chosen = chooseEvent(dedupe([...parsed, ...fixture]));
      } catch {
        /* keep the base offseason result */
      }
    }

    const score = build(team, chosen.status, chosen.event);
    // The arena boards want more than the score: only reach for it while a game
    // is on (or for a finished baseball line score), to stay gentle (spec §7).
    const wantsDetail =
      !!score.eventId && (score.status === 'live' || (score.status === 'final' && team.sport === 'baseball'));
    if (wantsDetail) score.live = await fetchSituation(team, score.eventId!, score.status === 'live');
    return score;
  } catch {
    return unavailable(team);
  }
}

// ─── Standings fetch + normalize ────────────────────────────────────────────

/*
 * Full league standings come from a different ESPN host than the schedule
 * endpoints (site.web.api.espn.com — the site.api host 404s on /standings).
 * `?level=3` asks for division groupings where the league has them (MLB, NFL,
 * NHL); leagues without divisions simply return conference groups, and the
 * walker below takes whatever groups carry entries, so a shape change degrades
 * to "unavailable" rather than throwing.
 */
const WEB = 'https://site.web.api.espn.com/apis/v2/sports';

interface LeagueTableConfig {
  level3: boolean;
  /** Column label → ESPN stat name(s), first one present wins. */
  columns: { label: string; stats: string[] }[];
  /** Sort within a group, best first. Ties keep ESPN's order (stable sort). */
  sortBy: string[];
}

const LEAGUE_TABLES: Record<string, LeagueTableConfig> = {
  'baseball/mlb': {
    level3: true,
    columns: [
      { label: 'W', stats: ['wins'] },
      { label: 'L', stats: ['losses'] },
      { label: 'PCT', stats: ['winPercent'] },
      { label: 'GB', stats: ['gamesBehind'] },
      { label: 'STRK', stats: ['streak'] },
    ],
    sortBy: ['winPercent'],
  },
  'football/nfl': {
    level3: true,
    columns: [
      { label: 'W', stats: ['wins'] },
      { label: 'L', stats: ['losses'] },
      { label: 'T', stats: ['ties'] },
      { label: 'PCT', stats: ['winPercent'] },
      { label: 'PF', stats: ['pointsFor'] },
      { label: 'PA', stats: ['pointsAgainst'] },
      { label: 'STRK', stats: ['streak'] },
    ],
    sortBy: ['winPercent', 'pointDifferential'],
  },
  'hockey/nhl': {
    level3: true,
    columns: [
      { label: 'GP', stats: ['gamesPlayed'] },
      { label: 'W', stats: ['wins'] },
      { label: 'L', stats: ['losses'] },
      { label: 'OTL', stats: ['otLosses', 'overtimeLosses'] },
      { label: 'PTS', stats: ['points'] },
      { label: 'STRK', stats: ['streak'] },
    ],
    sortBy: ['points'],
  },
  'basketball/wnba': {
    level3: false,
    columns: [
      { label: 'W', stats: ['wins'] },
      { label: 'L', stats: ['losses'] },
      { label: 'PCT', stats: ['winPercent'] },
      { label: 'GB', stats: ['gamesBehind'] },
      { label: 'STRK', stats: ['streak'] },
    ],
    sortBy: ['winPercent'],
  },
  'soccer/usa.1': {
    level3: false,
    columns: [
      { label: 'GP', stats: ['gamesPlayed'] },
      { label: 'W', stats: ['wins'] },
      { label: 'L', stats: ['losses'] },
      { label: 'T', stats: ['ties'] },
      { label: 'GD', stats: ['pointDifferential'] },
      { label: 'PTS', stats: ['points'] },
    ],
    sortBy: ['points', 'pointDifferential'],
  },
  'soccer/usa.nwsl': {
    level3: false,
    columns: [
      { label: 'GP', stats: ['gamesPlayed'] },
      { label: 'W', stats: ['wins'] },
      { label: 'L', stats: ['losses'] },
      { label: 'T', stats: ['ties'] },
      { label: 'GD', stats: ['pointDifferential'] },
      { label: 'PTS', stats: ['points'] },
    ],
    sortBy: ['points', 'pointDifferential'],
  },
};

/** The league key a team's standings live under, or null (e.g. the Sonics). */
export function leagueKeyOf(team: Team): string | null {
  if (team.kind === 'returning' || !team.sport || !team.league) return null;
  const key = `${team.sport}/${team.league}`;
  return LEAGUE_TABLES[key] ? key : null;
}

function statMap(entry: any): Map<string, string> {
  const m = new Map<string, string>();
  const stats: any[] = Array.isArray(entry?.stats) ? entry.stats : [];
  for (const st of stats) {
    if (typeof st?.name === 'string' && st.displayValue != null) {
      m.set(st.name, String(st.displayValue));
    }
  }
  return m;
}

function num(v: string | undefined): number {
  if (v == null) return Number.NEGATIVE_INFINITY;
  const n = parseFloat(v.replace(/[^0-9.+-]/g, ''));
  return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
}

/** Every node that actually carries entries, depth-first, in ESPN's order. */
function collectGroups(
  node: any,
  out: { name: string; season?: string; entries: any[] }[] = [],
) {
  const entries = node?.standings?.entries;
  if (Array.isArray(entries) && entries.length) {
    // The season a group's numbers belong to. Do NOT use the response's
    // top-level `season`: it points at the *upcoming* season in the offseason
    // (baseball reports 2027 over 2026's final table).
    const ssn = node?.standings?.seasonDisplayName;
    out.push({
      name: String(node?.name ?? ''),
      season: ssn != null && ssn !== '' ? String(ssn) : undefined,
      entries,
    });
  }
  const kids: any[] = Array.isArray(node?.children) ? node.children : [];
  for (const k of kids) collectGroups(k, out);
  return out;
}

/**
 * One league's full standings, normalized for the table component. Never
 * throws: any fetch/parse failure resolves to `status:'unavailable'` with no
 * groups, so the UI can say so instead of breaking (spec §10).
 * `ourTeamId` is the Seattle club's ESPN id *in this league*, used only to
 * flag its row.
 */
export async function fetchLeagueStandings(
  key: string,
  ourTeamId?: string,
): Promise<LeagueStandings> {
  const cfg = LEAGUE_TABLES[key];
  const stamp = new Date().toISOString();
  const fail: LeagueStandings = {
    key,
    status: 'unavailable',
    columns: cfg?.columns.map((c) => c.label) ?? [],
    groups: [],
    updatedAt: stamp,
  };
  if (!cfg) return fail;

  try {
    const url = `${WEB}/${key}/standings${cfg.level3 ? '?level=3' : ''}`;
    const data: any = await getJson(url);

    const raw = collectGroups(data);
    const groups: StandingsGroup[] = raw
      .map((g) => {
        const rows = g.entries
          .map((e, i) => {
            const t = e?.team;
            const stats = statMap(e);
            const row: StandingsRow & { _i: number } = {
              _i: i,
              teamId: String(t?.id ?? ''),
              name: String(t?.displayName ?? t?.name ?? t?.shortDisplayName ?? '—'),
              abbr: t?.abbreviation,
              logoUrl: t?.logos?.[0]?.href ?? t?.logo,
              ours: !!ourTeamId && String(t?.id) === String(ourTeamId),
              cells: cfg.columns.map((c) => {
                const hit = c.stats.find((s) => stats.has(s));
                return hit ? (stats.get(hit) as string) : '–';
              }),
            };
            return { row, stats };
          })
          .sort((a, b) => {
            for (const k of cfg.sortBy) {
              const d = num(b.stats.get(k)) - num(a.stats.get(k));
              if (d) return d; // note: -Infinity - -Infinity is NaN → falsy, falls through
            }
            return a.row._i - b.row._i;
          })
          .map(({ row }) => {
            const { _i, ...clean } = row;
            return clean as StandingsRow;
          });
        return { name: g.name, rows };
      })
      .filter((g) => g.rows.length > 0);

    if (!groups.length) return fail;

    // Season label from the groups themselves; the top-level field is only a
    // last resort (it can name the next season, see collectGroups).
    const top: unknown = data?.season;
    const topLabel =
      typeof top === 'object' && top
        ? (top as { displayName?: string; year?: number }).displayName ??
          String((top as { year?: number }).year ?? '')
        : top != null
          ? String(top)
          : undefined;
    // Keep just the year part: ESPN's soccer groups say "2026 MLS" / "2026 NWSL".
    const rawSeason = raw.find((g) => g.season)?.season ?? topLabel;
    const seasonLabel = rawSeason?.match(/^\d{4}(?:[-\u2013/]\d{2,4})?/)?.[0] ?? rawSeason;

    return {
      key,
      status: 'ok',
      season: seasonLabel || undefined,
      columns: cfg.columns.map((c) => c.label),
      groups,
      updatedAt: stamp,
    };
  } catch {
    return fail;
  }
}

// ─── League codes (short, URL-safe names for the box-score route) ───────────

const LEAGUE_CODES: Record<string, string> = {
  'baseball/mlb': 'mlb',
  'football/nfl': 'nfl',
  'hockey/nhl': 'nhl',
  'basketball/wnba': 'wnba',
  'soccer/usa.1': 'mls',
  'soccer/usa.nwsl': 'nwsl',
};
const CODE_TO_KEY: Record<string, string> = Object.fromEntries(
  Object.entries(LEAGUE_CODES).map(([k, v]) => [v, k]),
);

/** "mlb" for the Mariners, null for a club with no feed (the Sonics). */
export function leagueCodeOf(team: Team): string | null {
  if (team.kind === 'returning' || !team.sport || !team.league) return null;
  return LEAGUE_CODES[`${team.sport}/${team.league}`] ?? null;
}

/** In-app link to a game's box score. */
export function boxHref(leagueCode: string, eventId: string): string {
  return `/box?lg=${encodeURIComponent(leagueCode)}&id=${encodeURIComponent(eventId)}`;
}

// ─── Recent results (a team's last few finals, each with a box score) ───────

export interface GameResult {
  id: string;
  date: string; // ISO
  opponent: string;
  isHome: boolean;
  teamScore?: number;
  oppScore?: number;
  outcome: 'W' | 'L' | 'T';
}

/** W/L/T from the winner flags first (shootouts), then the score. */
function outcomeOf(e: ParsedEvent): 'W' | 'L' | 'T' {
  if (e.won === true) return 'W';
  if (e.oppWon === true) return 'L';
  if (e.teamScore != null && e.oppScore != null && e.teamScore !== e.oppScore) {
    return e.teamScore > e.oppScore ? 'W' : 'L';
  }
  return 'T';
}

/**
 * The last `n` completed games, newest first. The base schedule view is stale
 * in some leagues (it can hold only the early season, or only the next one), so
 * it is merged with the explicit current-season view, and with last season's
 * when the club hasn't played yet this year. Never throws: [] on any failure.
 */
export async function fetchRecentResults(team: Team, n = 5): Promise<GameResult[]> {
  if (team.kind === 'returning' || !team.espnTeamId) return [];
  const base = `${SITE}/${team.sport}/${team.league}/teams/${team.espnTeamId}/schedule`;
  const year = new Date().getFullYear();

  const pull = async (q: string): Promise<ParsedEvent[]> => {
    try {
      const data: any = await getJson(`${base}${q}`);
      const events: any[] = Array.isArray(data?.events) ? data.events : [];
      return events.map((e) => parseEvent(e, team)).filter((p): p is ParsedEvent => p !== null);
    } catch {
      return [];
    }
  };

  const finals = (xs: ParsedEvent[]) => xs.filter((p) => p.state === 'post');
  let all = finals(dedupe([...(await pull('')), ...(await pull(`?season=${year}`))]));
  if (all.length < n) all = finals(dedupe([...all, ...(await pull(`?season=${year - 1}`))]));

  return all
    .sort((a, b) => b.dateMs - a.dateMs)
    .slice(0, n)
    .map((e) => ({
      id: e.id,
      date: e.startDate,
      opponent: e.oppName ?? 'Opponent',
      isHome: e.isHome,
      teamScore: e.teamScore,
      oppScore: e.oppScore,
      outcome: outcomeOf(e),
    }));
}

// ─── Box score fetch + normalize ────────────────────────────────────────────

export interface BoxLine {
  teamId: string;
  name: string; // "Seattle Mariners"
  abbr?: string;
  logoUrl?: string;
  ours: boolean;
  winner: boolean;
  periods: string[]; // one per period/inning, aligned with BoxScore.periodLabels
  totals: string[]; // aligned with BoxScore.totalLabels: ['R','H','E'] or ['T']
}

export interface BoxTable {
  title: string; // "Batting", "Starting XI"
  columns: string[];
  rows: { name: string; pos?: string; starter?: boolean; cells: string[] }[];
  totals?: string[];
}

export interface BoxTeam {
  teamId: string;
  name: string;
  ours: boolean;
  tables: BoxTable[];
}

export interface BoxEvent {
  clock: string; // "15'"
  teamAbbr?: string;
  kind: 'goal' | 'card';
  text: string;
}

export interface BoxScore {
  status: 'ok' | 'unavailable';
  leagueCode: string;
  eventId: string;
  state?: 'pre' | 'in' | 'post';
  statusText?: string; // "Final", "Final/10", "Bot 7"
  date?: string; // ISO
  venue?: string;
  attendance?: string;
  periodLabels: string[];
  totalLabels: string[];
  lines: BoxLine[]; // visitor first, home second — the newspaper convention
  teams: BoxTeam[]; // same order as `lines`
  compare: { label: string; values: [string, string] }[];
  events: BoxEvent[]; // soccer: goals and cards
  updatedAt: string;
}

/** Player-table columns worth printing (ESPN's own labels). Absent = keep all. */
const BOX_COLUMNS: Record<string, Record<string, string[]>> = {
  'baseball/mlb': {
    batting: ['AB', 'R', 'H', 'RBI', 'HR', 'BB', 'K', 'AVG'],
    pitching: ['IP', 'H', 'R', 'ER', 'BB', 'K', 'HR', 'ERA'],
  },
  'hockey/nhl': {
    forwards: ['G', 'A', '+/-', 'SOG', 'HT', 'TK', 'GV', 'PIM', 'TOI'],
    defenses: ['G', 'A', '+/-', 'SOG', 'HT', 'TK', 'GV', 'PIM', 'TOI'],
    goalies: ['GA', 'SA', 'SV', 'SV%', 'TOI'],
  },
  'basketball/wnba': {
    '': ['MIN', 'PTS', 'FG', '3PT', 'FT', 'REB', 'AST', 'TO', 'STL', 'BLK', 'PF', '+/-'],
  },
};

/** Team-comparison rows (ESPN stat names), in print order. */
const BOX_COMPARE: Record<string, string[]> = {
  'football/nfl': [
    'firstDowns', 'totalYards', 'netPassingYards', 'rushingYards',
    'thirdDownEff', 'turnovers', 'totalPenaltiesYards', 'possessionTime',
  ],
  'hockey/nhl': [
    'shotsTotal', 'hits', 'blockedShots', 'takeaways', 'giveaways',
    'powerPlayGoals', 'powerPlayOpportunities',
  ],
  'soccer/usa.1': [
    'possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners',
    'foulsCommitted', 'yellowCards', 'redCards', 'offsides', 'saves',
  ],
  'soccer/usa.nwsl': [
    'possessionPct', 'totalShots', 'shotsOnTarget', 'wonCorners',
    'foulsCommitted', 'yellowCards', 'redCards', 'offsides', 'saves',
  ],
};

/** ESPN shouts some soccer labels ("SHOTS", "ON GOAL"); print them normally. */
function tidyLabel(label: string): string {
  if (label.length > 3 && label === label.toUpperCase()) {
    return label.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
  return label;
}

function titleCase(raw: string): string {
  const spaced = raw.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function periodLabel(key: string, i: number): string {
  if (key === 'hockey/nhl') return i < 3 ? String(i + 1) : i === 3 ? 'OT' : 'SO';
  if (key === 'football/nfl' || key === 'basketball/wnba') return i < 4 ? String(i + 1) : i === 4 ? 'OT' : `${i - 3}OT`;
  if (key.startsWith('soccer/')) return i === 0 ? '1' : i === 1 ? '2' : 'ET';
  return String(i + 1); // baseball innings
}

function parseGroup(g: any, picks: string[] | undefined): BoxTable | null {
  const labels: string[] = Array.isArray(g?.labels) ? g.labels.map(String) : [];
  const athletes: any[] = Array.isArray(g?.athletes) ? g.athletes : [];
  if (!labels.length || !athletes.length) return null;

  // Keep ESPN's order; drop the redundant H-AB column in favour of AB + H.
  const idx = labels
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => (picks ? picks.includes(l) : l !== 'H-AB'));
  // With an explicit pick list, print in the pick order (newspaper convention:
  // hockey leads with G A, not ESPN's TOI-first order).
  if (picks) idx.sort((a, b) => picks.indexOf(a.l) - picks.indexOf(b.l));
  if (!idx.length) return null;

  const rows = athletes
    .filter((a) => Array.isArray(a?.stats) && a.stats.length > 0)
    .map((a) => ({
      name: String(a?.athlete?.shortName ?? a?.athlete?.displayName ?? '—'),
      pos: a?.athlete?.position?.abbreviation as string | undefined,
      starter: a?.starter === true,
      cells: idx.map(({ i }) => (a.stats[i] != null && a.stats[i] !== '' ? String(a.stats[i]) : '–')),
    }));
  if (!rows.length) return null;

  const t: unknown[] | undefined = Array.isArray(g?.totals) ? g.totals : undefined;
  const raw = String(g?.name ?? g?.type ?? '');
  return {
    title: raw ? titleCase(raw) : 'Players',
    columns: idx.map(({ l }) => l),
    rows,
    totals: t ? idx.map(({ i }) => (t[i] != null && t[i] !== '' ? String(t[i]) : '')) : undefined,
  };
}

function soccerEvents(d: any, idToAbbr: Map<string, string>): BoxEvent[] {
  const evs: any[] = Array.isArray(d?.keyEvents) ? d.keyEvents : [];
  const out: BoxEvent[] = [];
  for (const e of evs) {
    const type = String(e?.type?.text ?? '');
    const isGoal = e?.scoringPlay === true;
    const isCard = /card/i.test(type);
    if (!isGoal && !isCard) continue;
    const who: string[] = (Array.isArray(e?.participants) ? e.participants : [])
      .map((p: any) => p?.athlete?.displayName)
      .filter(Boolean);
    const how = type.includes(' - ') ? type.split(' - ')[1].toLowerCase() : '';
    // Lead with what happened, so a goal can't be mistaken for a booking.
    const text = isGoal
      ? `Goal: ${who[0] ?? 'unknown'}${how ? ` (${how})` : ''}${who[1] ? `, assist ${who[1]}` : ''}`
      : `${type}: ${who[0] ?? 'unknown'}`;
    out.push({
      clock: String(e?.clock?.displayValue ?? ''),
      teamAbbr: idToAbbr.get(String(e?.team?.id)),
      kind: isGoal ? 'goal' : 'card',
      text,
    });
  }
  return out;
}

function unavailableBox(leagueCode: string, eventId: string): BoxScore {
  return {
    status: 'unavailable',
    leagueCode,
    eventId,
    periodLabels: [],
    totalLabels: [],
    lines: [],
    teams: [],
    compare: [],
    events: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * One game's box score, normalized across sports. Never throws: any failure
 * (unknown league, bad id, shape change) resolves to `status:'unavailable'`.
 * `ourTeamId` is the ESPN id of the Seattle club, to highlight it.
 */
export async function fetchBoxScore(leagueCode: string, eventId: string): Promise<BoxScore> {
  const key = CODE_TO_KEY[leagueCode];
  if (!key || !/^\d+$/.test(eventId)) return unavailableBox(leagueCode, eventId);

  try {
    const d: any = await getJson(`${SITE}/${key}/summary?event=${encodeURIComponent(eventId)}`);
    const comp = d?.header?.competitions?.[0];
    const competitors: any[] = Array.isArray(comp?.competitors) ? comp.competitors : [];
    if (competitors.length < 2) return unavailableBox(leagueCode, eventId);

    // Visitor first, home second.
    const sorted = [...competitors].sort((a, b) => (a?.homeAway === 'away' ? -1 : 1) - (b?.homeAway === 'away' ? -1 : 1));
    const isOurs = (c: any) => TEAMS_ESPN_IDS.has(`${key}:${String(c?.team?.id)}`);

    const longest = Math.max(...sorted.map((c) => (Array.isArray(c?.linescores) ? c.linescores.length : 0)));
    const nPeriods = key === 'baseball/mlb' ? Math.max(9, longest) : longest;
    const baseball = key === 'baseball/mlb';

    const lines: BoxLine[] = sorted.map((c) => {
      const ls: any[] = Array.isArray(c?.linescores) ? c.linescores : [];
      const periods = Array.from({ length: nPeriods }, (_, i) =>
        ls[i] ? String(ls[i]?.displayValue ?? ls[i]?.value ?? '') : '',
      );
      const score = c?.score != null ? String(typeof c.score === 'object' ? c.score.displayValue ?? c.score.value : c.score) : '';
      return {
        teamId: String(c?.team?.id ?? ''),
        name: String(c?.team?.displayName ?? c?.team?.name ?? '—'),
        abbr: c?.team?.abbreviation,
        logoUrl: c?.team?.logos?.[0]?.href ?? c?.team?.logo,
        ours: isOurs(c),
        winner: c?.winner === true,
        periods,
        totals: baseball ? [score, String(c?.hits ?? ''), String(c?.errors ?? '')] : [score],
      };
    });

    // Player tables, matched to competitors by team id.
    const picks = BOX_COLUMNS[key] ?? {};
    const players: any[] = Array.isArray(d?.boxscore?.players) ? d.boxscore.players : [];
    const rosters: any[] = Array.isArray(d?.rosters) ? d.rosters : [];
    const teams: BoxTeam[] = lines.map((line) => {
      const tables: BoxTable[] = [];
      const p = players.find((x) => String(x?.team?.id) === line.teamId);
      for (const g of Array.isArray(p?.statistics) ? p.statistics : []) {
        const gname = String(g?.name ?? g?.type ?? '');
        const t = parseGroup(g, picks[gname]);
        if (t) tables.push(t);
      }
      if (!tables.length && key.startsWith('soccer/')) {
        const r = rosters.find((x) => String(x?.team?.id) === line.teamId);
        const starters = (Array.isArray(r?.roster) ? r.roster : []).filter((x: any) => x?.starter === true);
        if (starters.length) {
          tables.push({
            title: `Starting XI${r?.formation ? ` · ${r.formation}` : ''}`,
            columns: [],
            rows: starters.map((x: any) => ({
              // Shirt number leads the name, as in a printed lineup.
              name: `${x?.jersey ? `${x.jersey}  ` : ''}${String(x?.athlete?.shortName ?? x?.athlete?.displayName ?? '—')}`,
              pos: x?.position?.abbreviation ?? x?.athlete?.position?.abbreviation,
              cells: [],
            })),
          });
        }
      }
      return { teamId: line.teamId, name: line.name, ours: line.ours, tables };
    });

    // Team comparison (flat-stat sports; baseball's team stats are nested and
    // already covered by the line score and player tables).
    const compare: BoxScore['compare'] = [];
    const ts: any[] = Array.isArray(d?.boxscore?.teams) ? d.boxscore.teams : [];
    const statsOf = (id: string) => {
      const t = ts.find((x) => String(x?.team?.id) === id);
      const m = new Map<string, { label: string; v: string }>();
      for (const st of Array.isArray(t?.statistics) ? t.statistics : []) {
        if (typeof st?.name === 'string' && st?.displayValue != null) {
          m.set(st.name, { label: tidyLabel(String(st?.label ?? st?.displayName ?? titleCase(st.name))), v: String(st.displayValue) });
        }
      }
      return m;
    };
    if (!baseball && lines.length === 2) {
      const a = statsOf(lines[0].teamId);
      const b = statsOf(lines[1].teamId);
      const want = BOX_COMPARE[key];
      let names = want ? want.filter((n) => a.has(n) && b.has(n)) : [];
      if (names.length < 3) names = [...a.keys()].filter((n) => b.has(n)).slice(0, 8);
      for (const n of names) {
        compare.push({ label: a.get(n)!.label, values: [a.get(n)!.v, b.get(n)!.v] });
      }
    }

    const idToAbbr = new Map(lines.map((l) => [l.teamId, l.abbr ?? ''] as [string, string]));
    const stateRaw: string | undefined = comp?.status?.type?.state;
    const att = d?.gameInfo?.attendance;

    return {
      status: 'ok',
      leagueCode,
      eventId,
      state: stateRaw === 'in' || stateRaw === 'post' || stateRaw === 'pre' ? stateRaw : undefined,
      statusText: comp?.status?.type?.detail ?? comp?.status?.type?.shortDetail,
      date: comp?.date,
      venue: d?.gameInfo?.venue?.fullName,
      attendance: typeof att === 'number' && att > 0 ? att.toLocaleString('en-US') : undefined,
      periodLabels: Array.from({ length: nPeriods }, (_, i) => periodLabel(key, i)),
      totalLabels: baseball ? ['R', 'H', 'E'] : ['T'],
      lines,
      teams,
      compare,
      events: key.startsWith('soccer/') ? soccerEvents(d, idToAbbr) : [],
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return unavailableBox(leagueCode, eventId);
  }
}
