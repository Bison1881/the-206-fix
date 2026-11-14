import { Link } from 'react-router-dom';
import { TEAMS, type Team } from '../lib/teams';
import { useScores } from '../lib/useScores';
import { useClubDesk } from '../lib/useClubDesk';
import { gameDay, gameWhen } from '../lib/time';
import type { TeamScore } from '../lib/espn';
import s from './GameDayInjuries.module.css';

/*
 * The front page's game-day injury report: for each club playing in the next
 * two days (or right now), who is hurt. Empty in the prerender (the score store
 * has nothing during the build) and whenever no club has a game coming up, so
 * it only ever appears on a game day. Clubs without an injury feed (MLS, NWSL)
 * are left out rather than shown as "none reported".
 */

const WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_ROWS = 6;
// Season-long absences are not game-day news.
const LONG_TERM = /injured reserve|season/i;

function playingSoon(g: TeamScore, now: number): boolean {
  if (g.status === 'live') return true;
  if (g.status !== 'scheduled' || !g.startDate) return false;
  const t = new Date(g.startDate).getTime();
  return !Number.isNaN(t) && t > now - 3 * 60 * 60 * 1000 && t - now <= WINDOW_MS;
}

function ClubInjuries({ team, game }: { team: Team; game: TeamScore }) {
  const { data } = useClubDesk(team);
  const rows = (data?.injuries ?? []).filter((p) => !LONG_TERM.test(p.status));
  if (data?.injuries == null) return null;

  const when = game.status === 'live' ? 'Playing now' : gameWhen(game.startDate, game.timeTbd)?.line.split(' · ')[1];
  const day = game.status === 'live' || !game.startDate ? '' : gameDay(game.startDate);
  const shown = rows.slice(0, MAX_ROWS);

  return (
    <div className={s.club}>
      <h3 className={s.clubHead}>
        <Link to={`/${team.id}`}>{team.name}</Link>
      </h3>
      <div className={s.game}>
        {game.isHome ? 'vs' : 'at'} {(game.opponent ?? '').trim()}
        {(day || when) && <span> · {[day, when].filter(Boolean).join(' ')}</span>}
      </div>
      {shown.length === 0 ? (
        <p className={s.none}>No injuries reported.</p>
      ) : (
        <ul className={s.list}>
          {shown.map((p) => (
            <li className={s.item} key={`${p.name}-${p.status}`}>
              <span>
                {p.name}
                {p.pos && <span className={s.pos}> {p.pos}</span>}
              </span>
              <span className={s.status}>{p.status}</span>
            </li>
          ))}
        </ul>
      )}
      {rows.length > shown.length && (
        <Link className={s.more} to={`/${team.id}`}>
          +{rows.length - shown.length} more
        </Link>
      )}
    </div>
  );
}

export default function GameDayInjuries() {
  const { scores } = useScores();
  const now = Date.now();
  const playing = scores.filter((g) => playingSoon(g, now));
  const clubs = playing
    .map((g) => ({ g, team: TEAMS.find((t) => t.id === g.key) }))
    .filter((x): x is { g: TeamScore; team: Team } => !!x.team);
  if (!clubs.length) return null;

  return (
    <section className={s.wrap} aria-label="Game-day injury report">
      <h2 className={s.head}>Injury report</h2>
      <div className={s.grid}>
        {clubs.map(({ g, team }) => (
          <ClubInjuries key={team.id} team={team} game={g} />
        ))}
      </div>
    </section>
  );
}
