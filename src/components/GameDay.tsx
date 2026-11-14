import { Link } from 'react-router-dom';
import { TEAMS } from '../lib/teams';
import { useScores } from '../lib/useScores';
import s from './GameDay.module.css';

/*
 * The front page's game-day banner: one line per club that is playing right now,
 * linking to the scoreboard. It renders nothing when no game is live, and nothing
 * in the prerender (the score store is empty during the build), so it can't mismatch
 * on hydration. The score store polls only while a game is live.
 */
export default function GameDay() {
  const { scores } = useScores();
  const live = scores.filter((x) => x.status === 'live');
  if (!live.length) return null;

  return (
    <Link to="/scores" className={s.banner} aria-label="Live now: open the scoreboard">
      <span className={s.flag}>
        <span className={s.lamp} aria-hidden="true" />
        Live now
      </span>
      <span className={s.games}>
        {live.map((g) => {
          const name = TEAMS.find((t) => t.id === g.key)?.name ?? g.displayName;
          const hasScore = g.teamScore != null && g.oppScore != null;
          return (
            <span key={g.key} className={s.game}>
              <b>{name}</b> {hasScore ? g.teamScore : ''}
              {hasScore ? ',' : ' vs'} {(g.opponent ?? '').trim()} {hasScore ? g.oppScore : ''}
              {g.detail && <span className={s.detail}> · {g.detail}</span>}
            </span>
          );
        })}
      </span>
      <span className={s.go}>Scoreboard →</span>
    </Link>
  );
}
