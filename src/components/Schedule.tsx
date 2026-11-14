import { useEffect, useState } from 'react';
import type { Team } from '../lib/teams';
import { fetchUpcoming, type UpcomingGame } from '../lib/espn';
import { gameDay, gameWhen } from '../lib/time';
import { buildIcs, downloadIcs } from '../lib/calendar';
import s from './Schedule.module.css';

/*
 * A club's upcoming games, on its page. A client-fetched island: the prerender
 * is empty and the games load on mount. Times read in Seattle's clock, with the
 * viewer's own time underneath when it differs.
 */

const GAMES = 5;
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
      {when?.local && <small className={s.local}>LOCAL: {when.local}</small>}
    </li>
  );
}

/** The rest of the club's schedule as a calendar file (the list above shows only the next few). */
function CalendarButton({ team }: { team: Team }) {
  const [state, setState] = useState<'idle' | 'busy' | 'none'>('idle');
  const click = async () => {
    setState('busy');
    const games = await fetchUpcoming(team, 400);
    if (!games?.length) return setState('none');
    downloadIcs(`${team.id}-schedule.ics`, buildIcs(team, games));
    setState('idle');
  };
  return (
    <button type="button" className={s.cal} onClick={click} disabled={state === 'busy'}>
      {state === 'busy' ? 'Preparing' : state === 'none' ? 'No games to add' : 'Add to calendar'}
    </button>
  );
}

/** One club's next games, with the calendar download. */
export default function ClubSchedule({ team }: { team: Team }) {
  const [entry, setEntry] = useState<Entry | undefined>();

  useEffect(() => {
    if (team.kind !== 'live') return;
    let live = true;
    fetchUpcoming(team, GAMES).then((r) => {
      if (live) setEntry(r ?? 'unavailable');
    });
    return () => {
      live = false;
    };
  }, [team]);

  // The Sonics have no feed, so no schedule to show.
  if (team.kind !== 'live') return null;

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
    <section className={s.panel} aria-label={`${team.name} schedule`}>
      <h2 className={s.title}>
        Schedule <span className={s.tz}>Seattle time</span>
      </h2>
      {body}
      {Array.isArray(entry) && entry.length > 0 && <CalendarButton team={team} />}
    </section>
  );
}
