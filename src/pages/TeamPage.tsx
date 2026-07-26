import type { Team } from '../lib/teams';
import { teamWire } from '../lib/feeds';
import Wire from '../components/Wire';
import PageMeta from '../components/PageMeta';
import s from './scaffold.module.css';

/*
 * A team's interior page (the Phase 2 auto-fed portion). Shows that team's
 * full wire set — anchor + depth — so the depth coverage lives where someone
 * looking for it goes, not on the front page (spec §5). Phase 3 adds the
 * hand-built depth on top of this.
 */
export default function TeamPage({ team }: { team: Team }) {
  const items = teamWire(team.id);

  return (
    <div className={s.page}>
      <PageMeta
        title={`Seattle ${team.name}`}
        description={`Seattle ${team.name} news from around the web — headlines, beat coverage and links out to every source, updated through the day on The 206 Fix.`}
        path={`/${team.id}`}
      />
      <span className={s.badge}>Seattle</span>
      <h1 className={s.banner}>{team.name}</h1>
      <div className={s.deck}>
        The latest {team.name} coverage from around the web — every headline links out to its source.
      </div>
      <hr className={s.rule} />
      <Wire items={items} />
    </div>
  );
}
