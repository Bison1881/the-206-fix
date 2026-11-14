import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TEAMS, type Team } from '../lib/teams';
import { useScores } from '../lib/useScores';
import { demoScore } from '../lib/demoScores';
import PageMeta from '../components/PageMeta';
import ScoreBoard from '../components/boards/ScoreBoard';
import s from './ScoresPage.module.css';

/*
 * The /scores board (spec §6, §8) — the SCORES nav destination: one scoreboard
 * per club, each styled after its own home (see components/boards), over the
 * same normalized data the ribbon uses. A live or just-finished game links to
 * its box score (/box); league tables live on /standings.
 * Client-hydrated island over a static skeleton, same as the ribbon: scores
 * share one fetch via useScores().
 */

// Sonics last: their marquee spans the full width under the six live boards.
const ORDERED: Team[] = [...TEAMS.filter((t) => t.kind !== 'returning'), ...TEAMS.filter((t) => t.kind === 'returning')];

export default function ScoresPage() {
  const { scores } = useScores();
  const scoreByKey = new Map(scores.map((x) => [x.key, x]));

  // /scores?demo=live swaps in fixture games so the live look can be checked off
  // season. Read after mount so the prerendered HTML and first client render match.
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    setDemo(new URLSearchParams(window.location.search).get('demo') === 'live');
  }, []);

  return (
    <div className={s.page}>
      <PageMeta
        title="Scoreboard"
        description="Live scores and next games for all seven Seattle clubs — Mariners, Seahawks, Kraken, Sonics, Sounders, Storm and Reign — on one board, with box scores."
        path="/scores"
      />
      <h1 className={s.banner}>Scoreboard</h1>
      <hr className={s.rule} />

      {demo && (
        <p className={s.demo} role="status">
          Demo data: made-up games, not real scores. <Link to="/scores">Show real scores</Link>
        </p>
      )}

      <div className={s.grid}>
        {ORDERED.map((t) => (
          <ScoreBoard key={t.id} team={t} score={demo ? demoScore(t, 'live') : scoreByKey.get(t.id)} />
        ))}
      </div>

      <p className={s.more}>
        <Link to="/standings">League standings →</Link>
      </p>
    </div>
  );
}
