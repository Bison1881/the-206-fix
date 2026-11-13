import type { Team } from '../../lib/teams';
import { boxHref, leagueCodeOf, type TeamScore } from '../../lib/espn';

/*
 * One normalized "what should the board say" shape, shared by every themed
 * scoreboard, so the seven designs differ in looks and never in logic. All
 * text is uppercase (boards shout). Visitor first, home second: the
 * scoreboard convention, whoever Seattle happens to be.
 */

export type BoardMode =
  | 'loading'
  | 'live'
  | 'final'
  | 'next'
  | 'off'
  | 'returning'
  | 'unavailable';

export interface BoardRow {
  name: string;
  score: string; // '' = dark (no score to show)
  ours: boolean;
}

/** In-game detail, already arranged visitor-first like the rows. */
export interface LiveView {
  periodLabel: string; // "7" | "3RD" | "2ND" | "OT" | "HALF"
  clock: string; // "4:12" ('' when the sport has none)
  half?: 'top' | 'bot' | 'mid' | 'end';
  bso?: { b: number | null; s: number | null; o: number | null }; // null = unknown (dark)
  innings?: { labels: string[]; lines: [string[], string[]]; cur?: { row: 0 | 1; col: number } };
  downText?: string; // "2ND & 7"
  spot?: string; // "SEA 35"
  ballRow?: 0 | 1; // which row has the football
  timeouts?: [number | null, number | null]; // by row; null = unknown (dark)
}

export interface BoardView {
  mode: BoardMode;
  rows: [BoardRow, BoardRow];
  status: string; // LIVE | FINAL | NEXT | OFFSEASON ...
  note: string; // the detail line: "BOT 7", "MON 07:05", "OFFSEASON · NEXT 25 MAR"
  series?: string;
  summary: string; // plain-text reading of the board, for screen readers
  boxTo?: string; // in-app link to the box score, when one exists
  live?: LiveView;
}

const MODE: Record<TeamScore['status'], BoardMode> = {
  live: 'live',
  final: 'final',
  scheduled: 'next',
  offseason: 'off',
  returning: 'returning',
  unavailable: 'unavailable',
};

const STATUS: Record<BoardMode, string> = {
  loading: '',
  live: 'LIVE',
  final: 'FINAL',
  next: 'NEXT',
  off: 'OFFSEASON',
  returning: 'RETURN WATCH',
  unavailable: 'NO FEED',
};

const ORD = ['', '1ST', '2ND', '3RD', '4TH'];
const clamp = (n: number | undefined, max: number): number | null =>
  n == null ? null : Math.max(0, Math.min(max, n));

/** Arrange ESPN's in-game detail the way the boards read it. */
function liveView(team: Team, score: TeamScore, ourRow: 0 | 1): LiveView | undefined {
  const l = score.live;
  if (!l) return undefined;
  const oppRow = (1 - ourRow) as 0 | 1;
  const byRow = <T,>(ours: T, opp: T): [T, T] => (ourRow === 0 ? [ours, opp] : [opp, ours]);
  const p = l.period;
  const detail = (score.detail ?? '').toUpperCase();

  if (team.sport === 'baseball') {
    const mine = l.linesOurs ?? [];
    const theirs = l.linesOpp ?? [];
    const played = Math.max(mine.length, theirs.length, p ?? 0, 1);
    // A ballpark board has ten inning boxes; in a long game it scrolls to the last ten.
    const first = played > 10 ? played - 9 : 1;
    const cell = (arr: string[], i: number) => arr[first - 1 + i] ?? '';
    const lines = byRow(
      Array.from({ length: 10 }, (_, i) => cell(mine, i)),
      Array.from({ length: 10 }, (_, i) => cell(theirs, i)),
    );
    const batting = l.half === 'top' ? 0 : l.half === 'bot' ? 1 : undefined;
    const col = p != null ? p - first : -1;
    const live = score.status === 'live';
    return {
      periodLabel: p != null ? String(p) : '',
      clock: '',
      half: l.half,
      bso: live ? { b: clamp(l.balls, 3), s: clamp(l.strikes, 2), o: clamp(l.outs, 2) } : undefined,
      innings: {
        labels: Array.from({ length: 10 }, (_, i) => String(first + i)),
        lines,
        cur: live && batting != null && col >= 0 && col < 10 ? { row: batting, col } : undefined,
      },
    };
  }

  if (team.sport === 'football') {
    const label = l.halftime ? 'HALF' : p == null ? '' : p > 4 ? 'OT' : ORD[p] ?? '';
    const none = (n: number | undefined) => (n == null ? null : Math.max(0, Math.min(3, n)));
    return {
      periodLabel: label,
      clock: l.halftime ? '' : l.clock ?? '',
      downText: l.downText?.toUpperCase(),
      spot: l.spot?.toUpperCase(),
      ballRow: l.ball === 'ours' ? ourRow : l.ball === 'opp' ? oppRow : undefined,
      timeouts: byRow(none(l.timeoutsOurs), none(l.timeoutsOpp)),
    };
  }

  if (team.sport === 'hockey') {
    const label = /\bSO\b|SHOOTOUT/.test(detail)
      ? 'SO'
      : /INT/.test(detail)
        ? 'INT'
        : p == null
          ? ''
          : p <= 3
            ? ORD[p]
            : p === 4
              ? 'OT'
              : `${p - 3}OT`;
    return { periodLabel: label, clock: l.clock ?? '' };
  }

  return undefined;
}

export function boardView(team: Team, score?: TeamScore): BoardView {
  const ours = team.name.toUpperCase();
  const mine = (s: string): BoardRow => ({ name: ours, score: s, ours: true });
  const blank: BoardRow = { name: '—', score: '', ours: false };

  if (!score) {
    return {
      mode: 'loading',
      rows: [mine(''), blank],
      status: STATUS.loading,
      note: '',
      summary: `${team.name}: loading`,
    };
  }

  const mode = MODE[score.status];
  const detail = (score.detail ?? '').toUpperCase();
  const opp = (score.opponent ?? '').toUpperCase() || '—';
  const hasScore = score.teamScore != null && score.oppScore != null;
  const inGame = mode === 'live' || mode === 'final' || mode === 'next';

  let rows: [BoardRow, BoardRow] = [mine(''), blank];
  if (inGame) {
    const me = mine(hasScore ? String(score.teamScore) : '');
    const them: BoardRow = { name: opp, score: hasScore ? String(score.oppScore) : '', ours: false };
    rows = score.isHome ? [them, me] : [me, them];
  }

  let note = detail;
  if (mode === 'final' && /^FINAL$/.test(detail)) note = '';
  if (mode === 'off') note = detail.replace(/^OFFSEASON\s*·?\s*/, '');
  if (mode === 'unavailable') note = '';

  const code = leagueCodeOf(team);
  const boxTo = score.eventId && code ? boxHref(code, score.eventId) : undefined;

  const reading =
    mode === 'live' || mode === 'final'
      ? `${rows[0].name} ${rows[0].score || 'no score'}, ${rows[1].name} ${rows[1].score || 'no score'}`
      : mode === 'next'
        ? `${team.name} ${score.isHome ? 'host' : 'visit'} ${opp}`
        : '';
  const summary = [team.name, STATUS[mode].toLowerCase(), reading, note.toLowerCase()]
    .filter(Boolean)
    .join(', ');

  const live = liveView(team, score, score.isHome ? 1 : 0);
  const liveReading = live
    ? [
        live.half && live.periodLabel ? `${live.half === 'top' ? 'top' : live.half === 'bot' ? 'bottom' : live.half} ${live.periodLabel}` : live.periodLabel,
        live.clock,
        live.bso && live.bso.b != null && live.bso.s != null && live.bso.o != null
          ? `${live.bso.b} balls ${live.bso.s} strikes ${live.bso.o} outs`
          : '',
        live.downText?.toLowerCase(),
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  return {
    mode,
    rows,
    status: STATUS[mode],
    note,
    series: score.series?.summary?.toUpperCase(),
    summary: liveReading ? `${summary}, ${liveReading}` : summary,
    boxTo,
    live,
  };
}
