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
import { gameWhen } from './time';
import { buildPicture, type PlayoffInput, type PlayoffPicture, type PlayoffRules } from './playoffs';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';

/** `${sport}/${league}:${espnTeamId}` for every Seattle club — to flag "ours". */
const TEAMS_ESPN_IDS = new Set(
  TEAMS.filter((t) => t.espnTeamId).map((t) => `${t.sport}/${t.league}:${t.espnTeamId}`),
);

const TIMEOUT_MS = 10_000;
const RECENT_FINAL_MS = 48 * 60 * 60 * 1000; // a "recent" final: within ~48h
const FRESH_FINAL_MS = 12 * 60 * 60 * 1000; // a final this close to its start always holds the board
const SOON_MS = 24 * 60 * 60 * 1000; // a game this close beats an older final
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
/** One batting-order slot as the ballpark board shows it. */
export interface LineupSlot {
  id?: string;
  jersey: string;
  name: string; // last name
  pos: string; // "SS"
  avg: string; // season ".282"
}

export interface PitcherSlot {
  name: string;
  era: string;
}

/** The player at the plate, with season numbers (centre of the ballpark board). */
export interface BatterCard {
  id: string;
  jersey: string;
  first: string;
  last: string;
  pos: string;
  stats: Record<string, string>; // ESPN labels: GP AB R H HR RBI BB AVG OBP SLG OPS XBH
}

export interface LiveSituation {
  period?: number; // inning | quarter | period
  clock?: string; // "4:12" (hockey / football)
  halftime?: boolean;
  statusDetail?: string; // the feed's own status text, e.g. "8:41 - 2nd" | "Final/SO"
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
  hitsOurs?: number; // baseball R H E: runs are the score, these are the other two
  hitsOpp?: number;
  errorsOurs?: number;
  errorsOpp?: number;
  lineupOurs?: LineupSlot[]; // nine slots, batting order
  lineupOpp?: LineupSlot[];
  pitcherOurs?: PitcherSlot; // the pitcher now in the game
  pitcherOpp?: PitcherSlot;
  batter?: BatterCard; // live games only
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
  timeTbd?: boolean; // upcoming game with no start time set yet
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
  /** Playoff field + bubble, when the league's format is known and the data supports it. */
  picture?: PlayoffPicture;
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
  tbd?: boolean; // the league has not set a start time yet
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
    tbd: comp?.timeValid === false || /\b(TBD|TBA)\b/i.test(String(comp?.status?.type?.detail ?? comp?.status?.type?.shortDetail ?? '')),
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

  const next = parsed
    .filter((p) => p.state === 'pre' && p.dateMs >= now)
    .sort((a, b) => a.dateMs - b.dateMs)[0];

  // A recent final holds the board, unless it is a day-old result and the next game
  // is about to start: then the board moves on to the preview.
  if (finals[0]) {
    const stale = now - finals[0].dateMs > FRESH_FINAL_MS;
    const soon = !!next && !next.tbd && next.dateMs - now <= SOON_MS;
    if (!(stale && soon)) return { status: 'final', event: finals[0] };
  }

  if (next && next.dateMs - now <= NEAR_MS) return { status: 'scheduled', event: next };
  return { status: 'offseason', event: next };
}

// "Mar 25". Seattle's calendar day, except for a placeholder time (the league has
// not set one), where the date as published (UTC) is the honest day.
function fmtShort(iso: string, tbd = false): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: tbd ? 'UTC' : 'America/Los_Angeles',
  });
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
        ? `Offseason · Next ${fmtShort(ev.startDate, ev.tbd)}`
        : team.offseasonCopy ?? 'Offseason',
    };
  }

  if (!ev) return { ...base, status: 'offseason', detail: team.offseasonCopy ?? 'Offseason' };

  const detail =
    status === 'scheduled'
      ? gameWhen(ev.startDate, ev.tbd)?.line ?? 'Scheduled'
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
    timeTbd: ev.tbd || undefined,
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

/** One upcoming game for a club's schedule list. */
export interface UpcomingGame {
  id: string;
  startDate: string; // ISO
  opponent: string;
  isHome: boolean;
  timeTbd: boolean;
  series?: string; // playoff series line, e.g. "Hurricanes lead series 2-1"
}

/**
 * A club's next `n` games, soonest first. Undefined when the feed cannot be
 * reached (the caller shows "unavailable"); an empty list means no games are
 * scheduled yet (offseason, schedule not released). Same two-step lookup as the
 * scoreboard: the base schedule, then the forward (fixture) view if that is short.
 */
export async function fetchUpcoming(team: Team, n = 5): Promise<UpcomingGame[] | undefined> {
  if (team.kind === 'returning' || !team.espnTeamId) return undefined;
  try {
    const now = Date.now();
    const upcoming = (events: ParsedEvent[]) =>
      dedupe(events)
        .filter((e) => e.state === 'pre' && e.dateMs >= now)
        .sort((a, b) => a.dateMs - b.dateMs);
    const base = await fetchScheduleEvents(team, false);
    let next = upcoming(base);
    if (next.length < n) {
      try {
        next = upcoming([...base, ...(await fetchScheduleEvents(team, true))]);
      } catch {
        /* keep what the base schedule gave */
      }
    }
    return next.slice(0, n).map((e) => ({
      id: e.id,
      startDate: e.startDate,
      opponent: e.oppName ?? 'TBD',
      isHome: e.isHome,
      timeTbd: !!e.tbd,
      series: e.series?.summary,
    }));
  } catch {
    return undefined;
  }
}

const intOf = (v: unknown): number | undefined => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
};

const lastNameOf = (short: string): string => {
  const i = short.indexOf(' ');
  return (i >= 0 ? short.slice(i + 1) : short).trim();
};

interface RosterInfo {
  jersey: string;
  first: string;
  last: string;
}

interface SideParse {
  lineup?: LineupSlot[];
  pitcher?: PitcherSlot;
  roster: Map<string, RosterInfo>;
}

/**
 * One club's lineup and current pitcher from a baseball summary: batting order,
 * positions and season AVG from the box score; jersey numbers from the roster.
 * A substitute replaces whoever batted in that slot before (later entry wins).
 */
function parseSide(summary: any, teamId: string): SideParse {
  const roster = new Map<string, RosterInfo>();
  const ros = (Array.isArray(summary?.rosters) ? summary.rosters : []).find((r: any) => String(r?.team?.id) === teamId);
  for (const e of Array.isArray(ros?.roster) ? ros.roster : []) {
    const id = String(e?.athlete?.id ?? '');
    if (!id) continue;
    const full = String(e?.athlete?.fullName ?? e?.athlete?.displayName ?? '');
    const last = String(e?.athlete?.lastName ?? '') || lastNameOf(String(e?.athlete?.shortName ?? full));
    roster.set(id, { jersey: String(e?.jersey ?? ''), first: full.replace(last, '').trim(), last });
  }
  const box = (Array.isArray(summary?.boxscore?.players) ? summary.boxscore.players : []).find(
    (p: any) => String(p?.team?.id) === teamId,
  );
  const groups: any[] = Array.isArray(box?.statistics) ? box.statistics : [];
  const bat = groups.find((g) => g?.type === 'batting');
  const pit = groups.find((g) => g?.type === 'pitching');

  let lineup: LineupSlot[] | undefined;
  if (bat) {
    const iAvg = (Array.isArray(bat.labels) ? bat.labels : []).indexOf('AVG');
    const byOrder = new Map<number, LineupSlot>();
    for (const a of Array.isArray(bat.athletes) ? bat.athletes : []) {
      const order = intOf(a?.batOrder);
      if (order == null || order < 1 || order > 9) continue;
      const id = String(a?.athlete?.id ?? '');
      const r = roster.get(id);
      const short = String(a?.athlete?.shortName ?? a?.athlete?.displayName ?? '');
      byOrder.set(order, {
        id: id || undefined,
        jersey: r?.jersey ?? '',
        name: r?.last || lastNameOf(short),
        pos: String(a?.position?.abbreviation ?? a?.athlete?.position?.abbreviation ?? ''),
        avg: iAvg >= 0 ? String(a?.stats?.[iAvg] ?? '') : '',
      });
    }
    if (byOrder.size) {
      lineup = Array.from({ length: 9 }, (_, i) => byOrder.get(i + 1) ?? { jersey: '', name: '', pos: '', avg: '' });
    }
  }

  let pitcher: PitcherSlot | undefined;
  const arms: any[] = Array.isArray(pit?.athletes) ? pit.athletes : [];
  if (arms.length) {
    const cur = arms[arms.length - 1];
    const iEra = (Array.isArray(pit.labels) ? pit.labels : []).indexOf('ERA');
    const short = String(cur?.athlete?.shortName ?? cur?.athlete?.displayName ?? '');
    pitcher = { name: String(cur?.athlete?.lastName ?? '') || lastNameOf(short), era: iEra >= 0 ? String(cur?.stats?.[iEra] ?? '') : '' };
  }
  return { lineup, pitcher, roster };
}

const batterStats = new Map<string, Record<string, string>>();

/**
 * A batter's latest-season numbers from ESPN's player stats feed: the batting
 * and expanded-batting tables, each row's `stats` aligned with the category's
 * `labels`. Cached by player (a season line does not change within a game).
 */
async function fetchBatterStats(id: string): Promise<Record<string, string> | undefined> {
  const hit = batterStats.get(id);
  if (hit) return hit;
  try {
    const d: any = await getJson(
      `https://site.web.api.espn.com/apis/common/v3/sports/baseball/mlb/athletes/${encodeURIComponent(id)}/stats`,
    );
    const out: Record<string, string> = {};
    for (const cat of Array.isArray(d?.categories) ? d.categories : []) {
      if (!/batting/.test(String(cat?.name ?? ''))) continue;
      const labels: string[] = Array.isArray(cat?.labels) ? cat.labels : [];
      const rows: any[] = Array.isArray(cat?.statistics) ? cat.statistics : [];
      if (!rows.length) continue;
      const row = rows.reduce(
        (best, r) => ((intOf(r?.season?.year) ?? 0) >= (intOf(best?.season?.year) ?? 0) ? r : best),
        rows[0],
      );
      labels.forEach((l, i) => {
        if (!(l in out) && row?.stats?.[i] != null) out[l] = String(row.stats[i]);
      });
    }
    if (!Object.keys(out).length) return undefined;
    batterStats.set(id, out);
    return out;
  } catch {
    return undefined;
  }
}

/** The live batter (from `situation.batter`) with season stats; undefined if the feed has no batter. */
async function buildBatter(raw: any, sides: SideParse[]): Promise<BatterCard | undefined> {
  const id = String(raw?.playerId ?? raw?.athlete?.id ?? raw?.id ?? '');
  if (!id || id === 'undefined') return undefined;
  let slot: LineupSlot | undefined;
  let info: RosterInfo | undefined;
  for (const s of sides) {
    slot = slot ?? s.lineup?.find((x) => x.id === id);
    info = info ?? s.roster.get(id);
  }
  const ath = raw?.athlete ?? {};
  const short = String(ath?.shortName ?? ath?.displayName ?? '');
  const last = info?.last || slot?.name || String(ath?.lastName ?? '') || lastNameOf(short);
  const full = String(ath?.fullName ?? ath?.displayName ?? '');
  const stats = (await fetchBatterStats(id)) ?? {};
  return {
    id,
    jersey: info?.jersey || slot?.jersey || String(ath?.jersey ?? ''),
    first: info?.first || (full && full.includes(last) ? full.replace(last, '').trim() : ''),
    last,
    pos: slot?.pos || String(ath?.position?.abbreviation ?? ''),
    stats,
  };
}

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
    let summary: any;
    if (live) {
      const d: any = await getJson(`${SITE}/${team.sport}/${team.league}/scoreboard`);
      const ev = (Array.isArray(d?.events) ? d.events : []).find((e: any) => String(e?.id) === eventId);
      comp = ev?.competitions?.[0];
      sit = comp?.situation;
    }
    if (!comp) {
      const d: any = await getJson(`${SITE}/${team.sport}/${team.league}/summary?event=${encodeURIComponent(eventId)}`);
      summary = d;
      comp = d?.header?.competitions?.[0];
      sit = comp?.situation ?? d?.situation;
    }
    // Lineups, pitchers and rosters live in the summary; a miss only costs the extras.
    if (team.sport === 'baseball' && !summary) {
      try {
        summary = await getJson(`${SITE}/${team.sport}/${team.league}/summary?event=${encodeURIComponent(eventId)}`);
      } catch {
        summary = undefined;
      }
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
    const sOurs = team.sport === 'baseball' ? parseSide(summary, String(ours?.team?.id)) : undefined;
    const sOpp = team.sport === 'baseball' ? parseSide(summary, String(opp?.team?.id)) : undefined;
    const batter =
      team.sport === 'baseball' && live && sOurs && sOpp ? await buildBatter(sit?.batter, [sOurs, sOpp]) : undefined;
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
    // Where the ball is: the tail of "2nd & 7 at SEA 35", else a bare "SEA 35".
    const atText: string | undefined = sit?.downDistanceText;
    const bare: string | undefined = sit?.possessionText;
    const spot =
      atText && / at /i.test(atText)
        ? atText.split(/ at /i).pop()
        : bare && /^[A-Za-z]{2,4}\s+\d{1,2}$/.test(bare.trim())
          ? bare.trim()
          : undefined;

    return {
      period: intOf(status?.period),
      clock: typeof status?.displayClock === 'string' ? status.displayClock : undefined,
      halftime: /halftime/i.test(String(status?.type?.name ?? '')) || /half/i.test(detail),
      statusDetail: typeof status?.type?.shortDetail === 'string' ? status.type.shortDetail : undefined,
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
      hitsOurs: intOf(ours?.hits),
      hitsOpp: intOf(opp?.hits),
      errorsOurs: intOf(ours?.errors),
      errorsOpp: intOf(opp?.errors),
      lineupOurs: sOurs?.lineup,
      lineupOpp: sOpp?.lineup,
      pitcherOurs: sOurs?.pitcher,
      pitcherOpp: sOpp?.pitcher,
      batter,
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
  /** Playoff format, for the playoff picture. Omitted → no picture for this league. */
  playoffs?: PlayoffRules & {
    /** ESPN's own seed stat, where it publishes one (otherwise `sortBy` orders the unit). */
    seedStat?: string;
  };
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
    playoffs: { berths: 6, scope: 'conference', kind: 'wl', seasonGames: 162, seedStat: 'playoffSeed' },
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
    playoffs: { berths: 7, scope: 'conference', kind: 'wl', seasonGames: 17, seedStat: 'playoffSeed' },
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
    playoffs: { berths: 8, scope: 'conference', kind: 'points', seasonGames: 82, seedStat: 'playoffSeed' },
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
    // The top eight league-wide, regardless of conference (ESPN's seeds are per conference, so not used).
    playoffs: { berths: 8, scope: 'league', kind: 'wl', seasonGames: 44 },
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
    // Nine per conference: seeds 1-7 straight in, 8 and 9 meet in a wild-card game.
    playoffs: { berths: 9, scope: 'conference', kind: 'points', seasonGames: 34 },
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
    playoffs: { berths: 8, scope: 'league', kind: 'points', seasonGames: 30 },
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

/** A stat as a plain number, 0 when missing. */
function n0(stats: Map<string, string>, name: string): number {
  const v = num(stats.get(name));
  return Number.isFinite(v) ? v : 0;
}

/**
 * The playoff picture for a league, from the same standings payload. Returns
 * undefined (and the page simply omits the section) when the league has no
 * known format or the payload doesn't carry what's needed.
 */
function playoffPictureOf(
  data: any,
  cfg: LeagueTableConfig,
  ourTeamId?: string,
): PlayoffPicture | undefined {
  const rules = cfg.playoffs;
  if (!rules) return undefined;

  // The units seeded against each other: each conference, or the whole league.
  const confs: any[] = Array.isArray(data?.children) ? data.children : [];
  const rawUnits =
    rules.scope === 'conference' && confs.length
      ? confs.map((c) => ({ name: String(c?.name ?? ''), entries: collectGroups(c).flatMap((g) => g.entries) }))
      : [{ name: '', entries: collectGroups(data).flatMap((g) => g.entries) }];

  const units = rawUnits.map((u) => {
    const rows = u.entries.map((e, i) => {
      const stats = statMap(e);
      const w = n0(stats, 'wins');
      const l = n0(stats, 'losses');
      const extra = n0(stats, 'ties') + n0(stats, 'otLosses') + n0(stats, 'overtimeLosses');
      const isHockey = stats.has('otLosses') || stats.has('overtimeLosses');
      const ties = n0(stats, 'ties');
      const gp = stats.has('gamesPlayed') ? n0(stats, 'gamesPlayed') : w + l + extra;
      // Hockey shows W-L-OTL and soccer W-L-T; everyone else shows W-L, with ties only when there are some.
      const record = isHockey
        ? `${w}-${l}-${extra}`
        : rules.kind === 'points' || ties
          ? `${w}-${l}-${ties}`
          : `${w}-${l}`;
      const seed = rules.seedStat ? num(stats.get(rules.seedStat)) : Number.NEGATIVE_INFINITY;
      const input: PlayoffInput = {
        teamId: String(e?.team?.id ?? ''),
        name: String(e?.team?.displayName ?? e?.team?.name ?? '—'),
        ours: !!ourTeamId && String(e?.team?.id) === String(ourTeamId),
        record,
        pts: rules.kind === 'points' ? stats.get('points') : undefined,
        gamesPlayed: gp,
        w: w + ties / 2,
        l: l + ties / 2,
        points: n0(stats, 'points'),
      };
      return { input, stats, seed, i };
    });
    // ESPN's own order when it gives one (a playoff seed, else a table rank within the unit);
    // otherwise the league's table sort.
    const seeded = !!rules.seedStat && rows.every((r) => Number.isFinite(r.seed));
    const ranked = !seeded && rows.every((r) => Number.isFinite(num(r.stats.get('rank'))));
    rows.sort((a, b) => {
      if (seeded) return a.seed - b.seed || a.i - b.i;
      if (ranked) return num(a.stats.get('rank')) - num(b.stats.get('rank')) || a.i - b.i;
      for (const k of cfg.sortBy) {
        const d = num(b.stats.get(k)) - num(a.stats.get(k));
        if (d) return d;
      }
      return a.i - b.i;
    });
    return { name: u.name, teams: rows.map((r) => r.input) };
  });

  return buildPicture(units, rules);
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
      picture: playoffPictureOf(data, cfg, ourTeamId),
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

    const stateRaw: string | undefined = comp?.status?.type?.state;
    // A game not yet played: ESPN fills the team stats with season averages and has
    // no line score, so show an empty line score of the usual length and no comparison.
    const notStarted = stateRaw === 'pre';

    const longest = Math.max(...sorted.map((c) => (Array.isArray(c?.linescores) ? c.linescores.length : 0)));
    const emptyPeriods = key.startsWith('soccer/') ? 2 : key === 'hockey/nhl' ? 3 : key === 'baseball/mlb' ? 9 : 4;
    const nPeriods = key === 'baseball/mlb' ? Math.max(9, longest) : notStarted && !longest ? emptyPeriods : longest;
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
    if (!baseball && !notStarted && lines.length === 2) {
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

// ─── Club desk: season leaders, injuries, roster moves ──────────────────────

/*
 * Three small feeds that live on a club's own page. They share a roster fetch
 * (which carries each player's injury status and lets us turn the leaders
 * feed's athlete links into names), and each can fail on its own: a part that
 * can't be had is `null`, a part that exists but is empty is `[]`, so the page
 * can tell "unavailable" from "nothing to report".
 */

const CORE = 'https://sports.core.api.espn.com/v2/sports';

export interface ClubLeader {
  name: string;
  pos?: string;
  value: string;
}
export interface LeaderGroup {
  label: string;
  leaders: ClubLeader[];
}
export interface InjuryRow {
  name: string;
  pos?: string;
  status: string; // ESPN's words: "Out", "Questionable", "Injured Reserve"...
  date?: string; // ISO, when the status was set
}
export interface MoveRow {
  date: string; // ISO
  text: string;
}
export interface ClubDesk {
  /** The season the leaders belong to, e.g. "2026" or "2026-27". */
  season?: string;
  leaders: LeaderGroup[] | null;
  injuries: InjuryRow[] | null;
  moves: MoveRow[] | null;
}

interface DeskConfig {
  /**
   * ESPN leader category → heading, in display order. `volume` reads a player's
   * workload (attempts, carries, catches) out of ESPN's display value, so a trick-play
   * passer can be dropped from a list ESPN does not qualify itself.
   */
  leaders: { name: string; label: string; volume?: RegExp }[];
  /** ESPN carries player injury status for this league. */
  injuries: boolean;
  /** ESPN carries a transactions feed for this league. */
  moves: boolean;
  /** Hockey seasons are labelled by the year they end in ("2027" is 2026-27). */
  splitYear?: boolean;
}

const DESK: Record<string, DeskConfig> = {
  'baseball/mlb': {
    leaders: [
      { name: 'avg', label: 'Batting average' },
      { name: 'homeRuns', label: 'Home runs' },
      { name: 'RBIs', label: 'Runs batted in' },
      { name: 'stolenBases', label: 'Stolen bases' },
      { name: 'ERA', label: 'Earned run average' },
      { name: 'wins', label: 'Wins' },
      { name: 'strikeouts', label: 'Strikeouts' },
      { name: 'saves', label: 'Saves' },
    ],
    injuries: true,
    moves: true,
  },
  'football/nfl': {
    leaders: [
      { name: 'passingLeader', label: 'Passing', volume: /\/(\d+)/ },
      { name: 'rushingLeader', label: 'Rushing', volume: /^(\d+)/ },
      { name: 'receivingLeader', label: 'Receiving', volume: /^(\d+)/ },
      { name: 'sacks', label: 'Sacks' },
      { name: 'interceptions', label: 'Interceptions' },
      { name: 'totalTackles', label: 'Tackles' },
    ],
    injuries: true,
    moves: true,
  },
  'hockey/nhl': {
    leaders: [
      { name: 'goals', label: 'Goals' },
      { name: 'assists', label: 'Assists' },
      { name: 'points', label: 'Points' },
      { name: 'plusMinus', label: 'Plus/minus' },
      { name: 'savePct', label: 'Save percentage' },
      { name: 'wins', label: 'Goalie wins' },
    ],
    injuries: true,
    moves: true,
    splitYear: true,
  },
  'basketball/wnba': {
    leaders: [
      { name: 'pointsPerGame', label: 'Points per game' },
      { name: 'reboundsPerGame', label: 'Rebounds per game' },
      { name: 'assistsPerGame', label: 'Assists per game' },
      { name: 'stealsPerGame', label: 'Steals per game' },
      { name: 'blocksPerGame', label: 'Blocks per game' },
    ],
    injuries: true,
    moves: true,
  },
  'soccer/usa.1': {
    leaders: [
      { name: 'goals', label: 'Goals' },
      { name: 'assists', label: 'Assists' },
      { name: 'shotsOnTarget', label: 'Shots on target' },
      { name: 'saves', label: 'Saves' },
    ],
    injuries: false,
    moves: false,
  },
  'soccer/usa.nwsl': {
    leaders: [
      { name: 'goals', label: 'Goals' },
      { name: 'assists', label: 'Assists' },
      { name: 'shotsOnTarget', label: 'Shots on target' },
      { name: 'saves', label: 'Saves' },
    ],
    injuries: false,
    moves: false,
  },
};

/** Does this club have a desk (leaders and friends)? The Sonics, for one, do not. */
export function hasClubDesk(team: Team): boolean {
  return !!team.espnTeamId && !!DESK[`${team.sport}/${team.league}`] && team.kind !== 'returning';
}

interface RosterPlayer {
  name: string;
  pos?: string;
  injury?: { status: string; date?: string };
}

/** id → player, from the roster (grouped by position for most leagues, flat for some). */
async function fetchRoster(base: string, id: string): Promise<Map<string, RosterPlayer>> {
  const data: any = await getJson(`${base}/teams/${id}/roster`);
  const groups: any[] = Array.isArray(data?.athletes) ? data.athletes : [];
  const flat: any[] = groups.flatMap((g) => (Array.isArray(g?.items) ? g.items : [g]));
  const out = new Map<string, RosterPlayer>();
  for (const p of flat) {
    if (!p?.id) continue;
    const inj = Array.isArray(p.injuries) ? p.injuries[0] : undefined;
    out.set(String(p.id), {
      name: String(p.displayName ?? p.fullName ?? ''),
      pos: p.position?.abbreviation,
      injury: inj?.status ? { status: String(inj.status), date: inj.date } : undefined,
    });
  }
  return out;
}

const STATUS_ORDER = ['out', 'injured reserve', 'doubtful', 'questionable', 'day-to-day'];

function injuriesOf(roster: Map<string, RosterPlayer>): InjuryRow[] {
  const rows: InjuryRow[] = [];
  for (const p of roster.values()) {
    if (p.injury && p.name) {
      rows.push({ name: p.name, pos: p.pos, status: p.injury.status, date: p.injury.date });
    }
  }
  const rank = (s: string) => {
    const i = STATUS_ORDER.indexOf(s.toLowerCase());
    return i === -1 ? STATUS_ORDER.length : i;
  };
  return rows.sort(
    (a, b) => rank(a.status) - rank(b.status) || (b.date ?? '').localeCompare(a.date ?? ''),
  );
}

/** The leaders feed for the newest season that has any (see the candidates below). */
async function fetchLeaders(
  sport: string,
  league: string,
  id: string,
  cfg: DeskConfig,
  roster: Map<string, RosterPlayer> | null,
): Promise<{ season: string; groups: LeaderGroup[] } | null> {
  const y = new Date().getFullYear();
  // ESPN names a season by one year, and which year differs by league (and the
  // newest one may not have a game yet), so take the first candidate with data.
  for (const year of [y + 1, y, y - 1]) {
    let data: any;
    try {
      data = await getJson(`${CORE}/${sport}/leagues/${league}/seasons/${year}/types/2/teams/${id}/leaders`);
    } catch {
      continue;
    }
    const cats: any[] = Array.isArray(data?.categories) ? data.categories : [];
    const picked = cfg.leaders
      .map((c) => ({ c, cat: cats.find((k) => k?.name === c.name) }))
      .filter((x) => Array.isArray(x.cat?.leaders) && x.cat.leaders.length > 0);
    if (!picked.length) continue;

    const athleteId = (l: any): string | undefined =>
      String(l?.athlete?.$ref ?? '').match(/\/athletes\/(\d+)/)?.[1];

    // The top three of each category, after dropping anyone whose workload is a
    // sliver of the leader's (a receiver's one trick-play pass).
    const MIN_SHARE = 0.15;
    const shortlist = (c: { volume?: RegExp }, cat: any): any[] => {
      const all: any[] = cat.leaders.slice(0, 6);
      if (!c.volume) return all.slice(0, 3);
      const vol = (l: any): number => Number(String(l?.displayValue ?? '').match(c.volume!)?.[1] ?? NaN);
      const top = vol(all[0]);
      return all.filter((l) => !(Number.isFinite(top) && vol(l) < top * MIN_SHARE)).slice(0, 3);
    };
    const shown = picked.map(({ c, cat }) => ({ c, rows: shortlist(c, cat) }));

    // Names come from the roster; anyone no longer on it (traded, released)
    // is looked up directly.
    const missing = new Map<string, string>();
    for (const { rows } of shown) {
      for (const l of rows) {
        const aid = athleteId(l);
        if (aid && !roster?.has(aid)) missing.set(aid, String(l.athlete.$ref).replace(/^http:/, 'https:'));
      }
    }
    const extra = new Map<string, string>();
    await Promise.all(
      [...missing].map(async ([aid, ref]) => {
        try {
          const a: any = await getJson(ref);
          if (a?.displayName ?? a?.fullName) extra.set(aid, String(a.displayName ?? a.fullName));
        } catch {
          /* leave unnamed; the row is dropped below */
        }
      }),
    );

    const groups: LeaderGroup[] = shown.map(({ c, rows }) => ({
      label: c.label,
      leaders: rows
        .map((l: any): ClubLeader | null => {
          const aid = athleteId(l);
          const p = aid ? roster?.get(aid) : undefined;
          const name = p?.name || (aid ? extra.get(aid) : undefined);
          return name && l?.displayValue != null
            ? { name, pos: p?.pos, value: String(l.displayValue) }
            : null;
        })
        .filter((l: ClubLeader | null): l is ClubLeader => !!l),
    }));
    const kept = groups.filter((g) => g.leaders.length > 0);
    if (!kept.length) continue;
    const label = cfg.splitYear ? `${year - 1}-${String(year).slice(2)}` : String(year);
    return { season: label, groups: kept };
  }
  return null;
}

async function fetchMoves(base: string, id: string): Promise<MoveRow[]> {
  const data: any = await getJson(`${base}/transactions?team=${encodeURIComponent(id)}`);
  const tx: any[] = Array.isArray(data?.transactions) ? data.transactions : [];
  return tx
    .filter((t) => t?.date && t?.description)
    .map((t) => ({ date: String(t.date), text: String(t.description) }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Leaders, injuries and roster moves for one club. Never throws: each part
 * resolves independently and an unavailable part comes back `null`.
 */
export async function fetchClubDesk(team: Team): Promise<ClubDesk> {
  const key = `${team.sport}/${team.league}`;
  const cfg = DESK[key];
  const id = team.espnTeamId;
  const none: ClubDesk = { leaders: null, injuries: null, moves: null };
  if (!cfg || !id) return none;
  const base = `${SITE}/${key}`;

  const rosterP = fetchRoster(base, id).catch(() => null);
  const movesP = cfg.moves ? fetchMoves(base, id).catch(() => null) : Promise.resolve(null);
  const roster = await rosterP;
  const leaders = await fetchLeaders(team.sport, team.league, id, cfg, roster).catch(() => null);

  return {
    season: leaders?.season,
    leaders: leaders ? leaders.groups : null,
    injuries: cfg.injuries && roster ? injuriesOf(roster) : null,
    moves: await movesP,
  };
}
