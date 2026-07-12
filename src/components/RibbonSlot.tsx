import { TEAMS } from '../lib/teams';
import styles from './RibbonSlot.module.css';

/*
 * Reserved score-ribbon slot. Phase 1 replaces the placeholder tokens with
 * live ESPN scores / next-game states. It exists now only so the page has its
 * top-of-fold furniture and the mobile collapse order can be verified.
 */
export default function RibbonSlot() {
  return (
    <div className={styles.ribbon} aria-label="Scoreboard (coming in Phase 1)">
      {TEAMS.map((t) => (
        <div className={styles.r} key={t.id}>
          <span className={styles.tm}>{t.abbr}</span>
          <span className={styles.ph}>—</span>
        </div>
      ))}
    </div>
  );
}
