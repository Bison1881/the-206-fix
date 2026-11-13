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

export interface BoardView {
  mode: BoardMode;
  rows: [BoardRow, BoardRow];
  status: string; // LIVE | FINAL | NEXT | OFFSEASON ...
  note: string; // the detail line: "BOT 7", "MON 07:05", "OFFSEASON · NEXT 25 MAR"
  series?: string;
  summary: string; // plain-text reading of the board, for screen readers
  boxTo?: string; // in-app link to the box score, when one exists
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

  return {
    mode,
    rows,
    status: STATUS[mode],
    note,
    series: score.series?.summary?.toUpperCase(),
    summary,
    boxTo,
  };
}
