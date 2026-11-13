import { useState } from 'react';
import { TEAMS } from '../lib/teams';
import { demoScore, type DemoState } from '../lib/demoScores';
import PageMeta from '../components/PageMeta';
import ScoreBoard from '../components/boards/ScoreBoard';
import s from './BoardsPage.module.css';

/*
 * /boards: a specimen sheet. Every scoreboard in every state, from fixtures, so
 * the designs can be reviewed (and regressions spotted) without waiting for a
 * live game. Unlinked, noindex, and kept out of the sitemap. Safe to delete.
 */

const STATES: { id: DemoState; label: string }[] = [
  { id: 'live', label: 'Live' },
  { id: 'final', label: 'Final' },
  { id: 'next', label: 'Next' },
  { id: 'off', label: 'Offseason' },
  { id: 'unavailable', label: 'No feed' },
  { id: 'loading', label: 'Loading' },
];

export default function BoardsPage() {
  const [state, setState] = useState<DemoState>('live');
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
          <ScoreBoard key={t.id} team={t} score={demoScore(t, state)} />
        ))}
      </div>
    </div>
  );
}
