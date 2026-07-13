import { Link } from 'react-router-dom';
import { aroundTheTeams } from '../lib/feeds';
import s from './feed.module.css';

/*
 * Around the Teams — one latest anchor headline per team, all seven always
 * named (spec §5). Team name links to that team's interior page; the headline
 * links out to the source. A team with no current item still gets a card.
 */
export default function AroundTheTeams() {
  const rows = aroundTheTeams();

  return (
    <section className={s.section}>
      <h2 className={s.sectionHead}>Around the Teams</h2>
      <div className={s.teams}>
        {rows.map(({ team, name, item }) => (
          <div className={s.teamCard} key={team}>
            <Link className={s.teamName} to={`/${team}`}>
              {name}
            </Link>
            {item ? (
              <a className={s.teamHeadline} href={item.link} target="_blank" rel="noopener noreferrer">
                {item.title}
              </a>
            ) : (
              <span className={s.teamQuiet}>No recent headlines</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
