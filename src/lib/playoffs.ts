/*
 * The playoff picture: who is in, who is on the bubble, and how far back the
 * bubble teams are. Pure logic over already-normalized rows. It knows nothing
 * about ESPN, whose shapes are read in espn.ts, so it can be tested alone.
 *
 * Seeding is not worked out here. The caller passes each unit's teams already
 * ordered best first (ESPN's own playoff seeds where it publishes them,
 * otherwise the league's standings sort), so tiebreakers stay ESPN's business.
 */

/** How a league measures "games back": by win/loss record or by points. */
export type BackKind = 'wl' | 'points';

export interface PlayoffRules {
  /** Teams that make the playoffs from each unit (conference, or the whole league). */
  berths: number;
  scope: 'conference' | 'league';
  kind: BackKind;
  /** Regular-season length, used to tell a finished season from one in progress. */
  seasonGames: number;
}

export interface PlayoffInput {
  teamId: string;
  name: string;
  ours: boolean;
  /** Display record, e.g. "7-1" or "13-4-2". */
  record: string;
  /** Display points for points leagues, e.g. "55". */
  pts?: string;
  gamesPlayed: number;
  /** Wins and losses with ties split in half (win/loss leagues). */
  w: number;
  l: number;
  /** Standings points (points leagues). */
  points: number;
}

export interface PlayoffTeam {
  teamId: string;
  name: string;
  ours: boolean;
  record: string;
  pts?: string;
  seed: number;
  /** Set on teams outside the field: games or points behind the last spot (0 = level). */
  back?: number;
}

export interface PlayoffUnit {
  name: string;
  field: PlayoffTeam[];
  bubble: PlayoffTeam[];
}

export interface PlayoffPicture {
  berths: number;
  scope: PlayoffRules['scope'];
  kind: BackKind;
  /** True once every club has played (nearly) its full schedule. */
  final: boolean;
  units: PlayoffUnit[];
  /** Where the Seattle club stands, if it appears in this league's table. */
  ours?: { name: string; unit: string; seed: number; in: boolean; back?: number };
}

const BUBBLE = 3;

/** How far behind the last playoff spot: games (halves allowed) or points. 0 means level. */
function backBy(kind: BackKind, last: PlayoffInput, t: PlayoffInput): number {
  const d = kind === 'points' ? last.points - t.points : (last.w - t.w + (t.l - last.l)) / 2;
  return Math.max(0, d);
}

/** "1½", "3" or "level", for the Back column. */
export function fmtBack(back: number): string {
  if (back <= 0) return 'level';
  const whole = Math.floor(back);
  const half = back - whole >= 0.5;
  return `${whole || ''}${half ? '½' : ''}`;
}

/** "1½ games", "1 game", "½ game", "3 points", "1 point". */
export function fmtBackLong(kind: BackKind, back: number): string {
  const n = fmtBack(back);
  const one = n === '1' || n === '½';
  if (kind === 'points') return `${n} ${one && n === '1' ? 'point' : 'points'}`;
  return `${n} ${one ? 'game' : 'games'}`;
}

export function buildPicture(
  units: { name: string; teams: PlayoffInput[] }[],
  rules: PlayoffRules,
): PlayoffPicture | undefined {
  const usable = units.filter((u) => u.teams.length > rules.berths);
  if (!usable.length) return undefined;

  let ours: PlayoffPicture['ours'];
  const out: PlayoffUnit[] = usable.map((u) => {
    const last = u.teams[rules.berths - 1];
    const field: PlayoffTeam[] = [];
    const bubble: PlayoffTeam[] = [];
    u.teams.forEach((t, i) => {
      const base: PlayoffTeam = {
        teamId: t.teamId,
        name: t.name,
        ours: t.ours,
        record: t.record,
        pts: t.pts,
        seed: i + 1,
      };
      if (i < rules.berths) {
        field.push(base);
        if (t.ours) ours = { name: t.name, unit: u.name, seed: i + 1, in: true };
      } else {
        const back = backBy(rules.kind, last, t);
        if (i < rules.berths + BUBBLE) bubble.push({ ...base, back });
        if (t.ours) ours = { name: t.name, unit: u.name, seed: i + 1, in: false, back };
      }
    });
    return { name: u.name, field, bubble };
  });

  const all = usable.flatMap((u) => u.teams);
  const final = all.every((t) => t.gamesPlayed >= rules.seasonGames - 1);

  return {
    berths: rules.berths,
    scope: rules.scope,
    kind: rules.kind,
    final,
    units: out,
    ours,
  };
}
