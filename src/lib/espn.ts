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
 *   schedule: .../{sport}/{league}/teams/{id}/schedule   → live/final/next
 *   team:     .../{sport}/{league}/teams/{id}             → record + standing
 */

import type { Team, TeamKey } from './teams';

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';

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
  updatedAt: string; // ISO
}

export interface TeamStanding {
  key: TeamKey;
  record?: string; // "50-40"
  standingSummary?: string; // "2nd in AL West"
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

    return build(team, chosen.status, chosen.event);
  } catch {
    return unavailable(team);
  }
}

/**
 * Compact one-line standing for one team (spec §8 tier-1): the cheap, reliable
 * `record` + `standingSummary` off the team-info endpoint. Never throws.
 */
export async function fetchTeamStanding(team: Team): Promise<TeamStanding> {
  const stamp = () => new Date().toISOString();
  if (team.kind === 'returning' || !team.espnTeamId) {
    return { key: team.id, updatedAt: stamp() };
  }
  try {
    const url = `${SITE}/${team.sport}/${team.league}/teams/${team.espnTeamId}`;
    const data: any = await getJson(url);
    const t = data?.team;
    return {
      key: team.id,
      record: t?.record?.items?.[0]?.summary,
      standingSummary: t?.standingSummary,
      updatedAt: stamp(),
    };
  } catch {
    return { key: team.id, updatedAt: stamp() };
  }
}
