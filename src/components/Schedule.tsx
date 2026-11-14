import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TEAMS, type Team, type TeamKey } from '../lib/teams';
import { fetchUpcoming, type UpcomingGame } from '../lib/espn';
import { gameDay, gameWhen } from '../lib/time';
import s from './Schedule.module.css';

/*
 * Upcoming games for each club, on the front page. A client-hydrated island over
 * a static skeleton: the prerendered HTML carries the club names (each a link to
 * the club's page, which keeps those pages reachable) and the games load on mount.
 * Times read in Seattle's clock, with the viewer's own time underneath when it differs.
 */

const GAMES = 4;
// The Sonics have no feed, so no schedule to show.
const CLUBS = TEAMS.filter((t) => t.kind === 'live');

type Entry = UpcomingGame[] | 'unavailable';

function Game({ g }: { g: UpcomingGame }) {
  const when = gameWhen(g.startDate, g.timeTbd);
  // "SUN NOV 15 · 1:05 PM PST" -> the time half sits on the right of the row.
  const time = when?.line.split(' · ')[1] ?? '';
  const day = g.timeTbd ? when?.line.split(' · ')[0] : gameDay(g.startDate);
  return (
    <li className={s.game}>
      <span className={s.day}>{day}</span>
      <span className={s.opp}>
        <span className={s.at}>{g.isHome ? 'vs' : 'at'}</span> {g.opponent}
        {g.series && <span className={s.series}>{g.series}</span>}
      </span>
      <span className={s.time}>{time}</span>
      {when?.local && <small className={s.local}>YOUR TIME: {when.local}</small>}
    </li>
  );
}

function Club({ team, entry }: { team: Team; entry?: Entry }) {
  let body;
  if (!entry) body = <p className={s.note}>Loading schedule</p>;
  else if (entry === 'unavailable') body = <p className={s.note}>Schedule unavailable</p>;
  else if (!entry.length) body = <p className={s.note}>Schedule not yet released</p>;
  else
    body = (
      <ol className={s.list}>
        {entry.map((g) => (
          <Game key={g.id} g={g} />
        ))}
      </ol>
    );

  return (
    <section className={s.club} aria-label={`${team.name} schedule`}>
      <h3 className={s.clubHead}>
        <Link to={`/${team.id}`}>{team.name}</Link>
      </h3>
      {body}
    </section>
  );
}

export default function Schedule() {
  const [data, setData] = useState<Partial<Record<TeamKey, Entry>>>({});

  useEffect(() => {
    let live = true;
    for (const t of CLUBS) {
      fetchUpcoming(t, GAMES).then((r) => {
        if (live) setData((d) => ({ ...d, [t.id]: r ?? 'unavailable' }));
      });
    }
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className={s.wrap} aria-labelledby="schedule-head">
      <h2 id="schedule-head" className={s.head}>
        The Schedule <span className={s.tz}>Seattle time</span>
      </h2>
      <div className={s.grid}>
        {CLUBS.map((t) => (
          <Club key={t.id} team={t} entry={data[t.id]} />
        ))}
      </div>
    </section>
  );
}
