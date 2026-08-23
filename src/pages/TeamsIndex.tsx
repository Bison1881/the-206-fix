import { Link } from 'react-router-dom';
import { TEAMS } from '../lib/teams';
import PageMeta from '../components/PageMeta';
import s from './scaffold.module.css';
import t from './TeamsIndex.module.css';

/*
 * The TEAMS section front. Big four first (front-page prominence, full interior
 * pages), then the other three — every team named, tier shows only in ordering
 * and the note, never in whether a team appears.
 *
 * DORMANT 2026-08: the TEAMS nav entry that used to land here is gone, leaving
 * this page with no inbound internal link, so it is noindexed and excluded from
 * the sitemap (scripts/generate-seo.mjs) rather than left as an indexed orphan.
 * The page still renders and the URL still resolves. The seven team pages it
 * links to are NOT hidden — they stay indexed and reachable from Around the
 * Teams on the front page. To restore: drop the noindex, clear the exclusion,
 * and re-add the nav entries in SectionNav/Colophon.
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
      <PageMeta
        title="The Teams"
        description="Every Seattle club on one desk — Mariners, Seahawks, Kraken, Sonics, Sounders, Storm and Reign. Pick a beat for that team's full wire."
        path="/teams"
        noindex
      />
      <h1 className={s.banner}>The Teams</h1>
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
