import type { Team } from '../lib/teams';
import { useClubDesk } from '../lib/useClubDesk';
import { shortDate } from '../lib/time';
import s from './ClubDesk.module.css';

/*
 * A club's season leaders, injury report and roster moves, in newspaper boxes.
 * Client-fetched (see useClubDesk): the prerender is empty, and a part that
 * can't be loaded is simply left out rather than shown broken.
 */
export default function ClubDesk({ team }: { team: Team }) {
  const { data } = useClubDesk(team);
  if (!data) return null;
  const { leaders, injuries, moves } = data;
  if (!leaders?.length && injuries === null && !moves?.length) return null;

  return (
    <div className={s.desk}>
      {leaders && leaders.length > 0 && (
        <section className={s.panel} aria-label={`${team.name} season leaders`}>
          <h2 className={s.title}>Season leaders</h2>
          {data.season && <div className={s.sub}>{data.season} season, regular season</div>}
          <div className={s.boxes}>
            {leaders.map((g) => (
              <div className={s.box} key={g.label}>
                <h3 className={s.boxHead}>{g.label}</h3>
                <ol className={s.rows}>
                  {g.leaders.map((l, i) => (
                    <li className={s.leader} key={`${l.name}-${i}`}>
                      <span className={s.who}>
                        {l.name}
                        {l.pos && <span className={s.pos}> {l.pos}</span>}
                      </span>
                      <span className={i === 0 ? s.valueTop : s.value}>{l.value}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>
      )}

      {(injuries !== null || (moves && moves.length > 0)) && (
        <div className={s.pair}>
          {injuries !== null && (
            <section className={s.panel} aria-label={`${team.name} injury report`}>
              <h2 className={s.title}>Injury report</h2>
              {injuries.length === 0 ? (
                <p className={s.none}>No injuries reported.</p>
              ) : (
                <ul className={s.list}>
                  {injuries.map((p) => (
                    <li className={s.item} key={`${p.name}-${p.status}`}>
                      <span className={s.who}>
                        {p.name}
                        {p.pos && <span className={s.pos}> {p.pos}</span>}
                      </span>
                      <span className={s.status}>{p.status}</span>
                      <span className={s.when}>{shortDate(p.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          {moves && moves.length > 0 && (
            <section className={s.panel} aria-label={`${team.name} roster moves`}>
              <h2 className={s.title}>Roster moves</h2>
              <ul className={s.list}>
                {moves.slice(0, 8).map((m, i) => (
                  <li className={s.move} key={`${m.date}-${i}`}>
                    <span className={s.when}>{shortDate(m.date)}</span>
                    <span>{m.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
