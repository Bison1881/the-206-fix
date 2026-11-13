import { useState } from 'react';
import { TEAMS, type Team } from '../lib/teams';
import type { TeamScore } from '../lib/espn';
import PageMeta from '../components/PageMeta';
import ScoreBoard from '../components/boards/ScoreBoard';
import s from './BoardsPage.module.css';

/*
 * /boards: a specimen sheet. Every scoreboard in every state, from fixtures, so
 * the designs can be reviewed (and regressions spotted) without waiting for a
 * live game. Unlinked, noindex, and kept out of the sitemap. Safe to delete.
 */

type State = 'live' | 'final' | 'next' | 'off' | 'unavailable' | 'loading';

const STATES: { id: State; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'final', label: 'Final' },
  { id: 'next', label: 'Next' },
  { id: 'off', label: 'Offseason' },
  { id: 'unavailable', label: 'No feed' },
  { id: 'loading', label: 'Loading' },
];

// Opponent, live clock text, scores (ours, theirs), home?
const GAME: Record<string, { opp: string; clock: string; us: number; them: number; home: boolean }> = {
  mariners: { opp: 'Angels', clock: 'Bot 7', us: 7, them: 3, home: true },
  seahawks: { opp: 'Cardinals', clock: '4:12 - 3rd', us: 17, them: 3, home: true },
  kraken: { opp: 'Hurricanes', clock: '8:41 - 2nd', us: 1, them: 4, home: false },
  sounders: { opp: 'Rapids', clock: "67'", us: 2, them: 0, home: true },
  storm: { opp: 'Wings', clock: '5:02 - 4th', us: 91, them: 103, home: true },
  reign: { opp: 'North Carolina', clock: "74'", us: 0, them: 1, home: false },
};

function fixture(team: Team, state: State): TeamScore | undefined {
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
        detail: g.clock, eventId: '1',
        series: team.id === 'kraken' ? { summary: 'Hurricanes lead series 2-1', results: [] } : undefined,
      };
    case 'final':
      return {
        ...base, status: 'final', opponent: g.opp, teamScore: g.us, oppScore: g.them, isHome: g.home,
        detail: team.id === 'mariners' ? 'Final/10' : 'Final', eventId: '1',
      };
    case 'next':
      return { ...base, status: 'scheduled', opponent: g.opp, isHome: g.home, detail: 'Mon 07:05' };
    case 'off':
      return { ...base, status: 'offseason', detail: 'Offseason · Next 25 Mar' };
    case 'unavailable':
      return { ...base, status: 'unavailable', detail: 'Score unavailable' };
  }
}

export default function BoardsPage() {
  const [state, setState] = useState<State>('live');
  return (
    <div className={s.page}>
      <PageMeta title="Boards" description="Scoreboard specimen sheet." noindex />
      <h1 className={s.banner}>Boards</h1>
      <div className={s.deck}>Every scoreboard in every state, from fixtures. Not linked from the site.</div>
      <hr className={s.rule} />
      <div className={s.tabs} role="tablist" aria-label="Board state">
        {STATES.map((st) => (
          <button
            key={st.id}
            type="button"
            role="tab"
            aria-selected={state === st.id}
            className={state === st.id ? s.tabOn : s.tab}
            onClick={() => setState(st.id)}
          >
            {st.label}
          </button>
        ))}
      </div>
      <div className={s.grid}>
        {[...TEAMS.filter((t) => t.kind !== 'returning'), ...TEAMS.filter((t) => t.kind === 'returning')].map((t) => (
          <ScoreBoard key={t.id} team={t} score={fixture(t, state)} />
        ))}
      </div>
    </div>
  );
}
