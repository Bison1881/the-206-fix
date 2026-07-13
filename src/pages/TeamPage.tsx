import type { Team } from '../lib/teams';
import { teamWire } from '../lib/feeds';
import Wire from '../components/Wire';
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
      <span className={s.badge}>Seattle</span>
      <div className={s.banner}>{team.name}</div>
      <div className={s.deck}>
        The latest {team.name} coverage from around the web — every headline links out to its source.
      </div>
      <hr className={s.rule} />
      <Wire items={items} />
    </div>
  );
}
