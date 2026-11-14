import type { Team } from './teams';
import type { LineupSlot, LiveSituation, TeamScore } from './espn';

/*
 * Fixture scores for the boards. Used by the /boards specimen sheet, and by
 * /scores?demo=live so the real page can show every board mid-game without
 * waiting for one. Nothing here touches ESPN.
 */

export type DemoState = 'live' | 'final' | 'next' | 'off' | 'unavailable' | 'loading';

// Opponent, live clock text, scores (ours, theirs), home?
const GAME: Record<string, { opp: string; clock: string; us: number; them: number; home: boolean }> = {
  mariners: { opp: 'Giants', clock: 'Top 7', us: 7, them: 3, home: true },
  seahawks: { opp: 'Cardinals', clock: '4:12 - 3rd', us: 17, them: 3, home: true },
  kraken: { opp: 'Hurricanes', clock: '8:41 - 2nd', us: 1, them: 4, home: false },
  sounders: { opp: 'Rapids', clock: "67'", us: 2, them: 0, home: true },
  storm: { opp: 'Wings', clock: '5:02 - 4th', us: 91, them: 103, home: true },
  reign: { opp: 'North Carolina', clock: "74'", us: 0, them: 1, home: false },
};

// Lineups for the Mariners board: made-up game, real clubs' batting orders.
const slot = (jersey: string, name: string, pos: string, avg: string, id?: string): LineupSlot => ({ id, jersey, name, pos, avg });
const MARINERS_LINEUP: LineupSlot[] = [
  slot('3', 'Crawford', '3B', '.216'), slot('44', 'Rodriguez', 'DH', '.259'), slot('8', 'Canzone', 'RF', '.261'),
  slot('56', 'Arozarena', 'LF', '.283'), slot('12', 'Naylor', '1B', '.253'), slot('29', 'Raleigh', 'C', '.167'),
  slot('2', 'Young', '2B', '.251'), slot('20', 'Raley', 'CF', '.230'), slot('4', 'Emerson', 'SS', '.197'),
];
const GIANTS_LINEUP: LineupSlot[] = [
  slot('1', 'Arraez', '2B', '.268'), slot('8', 'Eldridge', 'DH', '.240'), slot('10', 'Schmitt', '3B', '.282', 'schmitt'),
  slot('16', 'Devers', '1B', '.246'), slot('17', 'Ramos', 'LF', '.278'), slot('51', 'Lee', 'RF', '.307'),
  slot('2', 'Adames', 'SS', '.229'), slot('0', 'Gilbert', 'CF', '.232'), slot('6', 'Susac', 'C', '.262'),
];

// In-game detail for the live fixtures (the real feed supplies this only while a game is on).
const LIVE: Record<string, LiveSituation> = {
  mariners: {
    period: 7, half: 'top', balls: 0, strikes: 1, outs: 1,
    linesOurs: ['1', '0', '0', '3', '0', '3'], linesOpp: ['0', '0', '1', '0', '0', '2', '0'],
    hitsOurs: 9, hitsOpp: 6, errorsOurs: 0, errorsOpp: 1,
    lineupOurs: MARINERS_LINEUP, lineupOpp: GIANTS_LINEUP,
    pitcherOurs: { name: 'Woo', era: '4.21' }, pitcherOpp: { name: 'Webb', era: '3.86' },
    batter: {
      id: 'schmitt', jersey: '10', first: 'Casey', last: 'Schmitt', pos: '3B',
      stats: { AVG: '.282', HR: '19', RBI: '50', OPS: '.805', GP: '90', AB: '355', H: '100', XBH: '37', R: '43', BB: '9', OBP: '.309', SLG: '.496' },
    },
  },
  seahawks: {
    period: 3, clock: '4:12', down: 2, distance: 7, downText: '2nd & 7', spot: 'SEA 35', ball: 'ours',
    timeoutsOurs: 2, timeoutsOpp: 3,
  },
  kraken: { period: 2, clock: '8:41' },
};

// A ten-inning final, to show the board with its tenth box in use.
const MARINERS_FINAL: LiveSituation = {
  linesOurs: ['1', '0', '0', '0', '2', '0', '0', '0', '0', '1'],
  linesOpp: ['0', '0', '1', '0', '0', '2', '0', '0', '0', '0'],
  hitsOurs: 8, hitsOpp: 5, errorsOurs: 1, errorsOpp: 0,
  lineupOurs: MARINERS_LINEUP, lineupOpp: GIANTS_LINEUP,
  pitcherOurs: { name: 'Woo', era: '4.21' }, pitcherOpp: { name: 'Webb', era: '3.86' },
};

export function demoScore(team: Team, state: DemoState): TeamScore | undefined {
  if (state === 'loading') return undefined;
  const base = { key: team.id, displayName: team.name, updatedAt: '2026-11-13T00:00:00Z' };
  if (team.kind === 'returning') {
    return { ...base, status: 'returning', detail: 'EST. 1967 · RETURN WATCH' };
  }
  const g = GAME[team.id];
  switch (state) {
    case 'live':
      return {
        ...base, status: 'live', opponent: g.opp, teamScore: g.us, oppScore: g.them, isHome: g.home,
        detail: g.clock, eventId: '1', live: LIVE[team.id],
        series: team.id === 'kraken' ? { summary: 'Hurricanes lead series 2-1', results: [] } : undefined,
      };
    case 'final':
      return {
        ...base, status: 'final', opponent: g.opp, isHome: g.home, eventId: '1',
        teamScore: team.id === 'mariners' ? 4 : g.us,
        oppScore: team.id === 'mariners' ? 3 : g.them,
        detail: team.id === 'mariners' ? 'Final/10' : 'Final',
        live: team.id === 'mariners' ? MARINERS_FINAL : undefined,
      };
    case 'next':
      return { ...base, status: 'scheduled', opponent: g.opp, isHome: g.home, detail: 'Sun Nov 15 · 1:05 PM PST', startDate: '2026-11-15T21:05:00Z' };
    case 'off':
      return { ...base, status: 'offseason', detail: 'Offseason · Next 25 Mar' };
    case 'unavailable':
      return { ...base, status: 'unavailable', detail: 'Score unavailable' };
  }
}
