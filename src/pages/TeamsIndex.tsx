import { Link } from 'react-router-dom';
import { TEAMS } from '../lib/teams';
import s from './scaffold.module.css';
import t from './TeamsIndex.module.css';

/*
 * The TEAMS section front. Primary nav's TEAMS item lands here instead of
 * listing all seven clubs in the bar. Big four first (front-page prominence,
 * full interior pages), then the other three — every team named, tier shows
 * only in ordering and the note, never in whether a team appears.
 */
const big4 = TEAMS.filter((x) => x.tier === 'big4');
const others = TEAMS.filter((x) => x.tier === 'other');

function TeamCard({ id, name, abbr, note }: { id: string; name: string; abbr: string; note: string }) {
  return (
    <Link to={`/${id}`} className={`${s.slot} ${t.card}`}>
      <span className={s.badge}>{abbr}</span>
      <h3>{name}</h3>
      <p>{note}</p>
    </Link>
  );
}

export default function TeamsIndex() {
  return (
    <div className={s.page}>
      <div className={s.banner}>The Teams</div>
      <div className={s.deck}>Seven Seattle clubs, one desk. Pick a beat.</div>
      <hr className={s.rule} />

      <div className={s.grid}>
        {big4.map((team) => (
          <TeamCard
            key={team.id}
            id={team.id}
            name={team.name}
            abbr={team.abbr}
            note="Front-page club · full interior page"
          />
        ))}
        {others.map((team) => (
          <TeamCard
            key={team.id}
            id={team.id}
            name={team.name}
            abbr={team.abbr}
            note="Named on the front page · feed-only interior page"
          />
        ))}
      </div>
    </div>
  );
}
