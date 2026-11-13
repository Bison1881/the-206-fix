import { Link } from 'react-router-dom';
import { TEAMS, type Team } from '../lib/teams';
import { useScores } from '../lib/useScores';
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

  return (
    <div className={s.page}>
      <PageMeta
        title="Scoreboard"
        description="Live scores and next games for all seven Seattle clubs — Mariners, Seahawks, Kraken, Sonics, Sounders, Storm and Reign — on one board, with box scores."
        path="/scores"
      />
      <h1 className={s.banner}>Scoreboard</h1>
      <div className={s.deck}>
        Live scores and next games for all seven Seattle clubs — refreshing on
        their own while a game is on.
      </div>
      <hr className={s.rule} />

      <div className={s.grid}>
        {ORDERED.map((t) => (
          <ScoreBoard key={t.id} team={t} score={scoreByKey.get(t.id)} />
        ))}
      </div>

      <p className={s.more}>
        <Link to="/standings">League standings →</Link>
      </p>
    </div>
  );
}
