import { Link, useLocation } from 'react-router-dom';
import styles from './SectionNav.module.css';

/*
 * Primary navigation — a vintage newspaper section-index line, built into the
 * shared shell so it rides under the masthead on every page. Secondary/utility
 * links live in the footer.
 *
 * DORMANT 2026-08: Teams, This Day, Almanac and Highlights were removed from
 * this bar. The three Phase 3 routes are empty scaffolds and are now noindexed
 * (see routes.tsx); /teams and the seven team pages are still built, still
 * populated and still linked from Around the Teams on the front page — only
 * their top-level menu entry is gone. To restore, put the entries back below
 * and re-add the TEAMS-aware active check from git history (commit 3f3c213^).
 */
const ITEMS = [
  { label: 'Scores', to: '/scores' }, // the live scoreboard board (Phase 1)
];

export default function SectionNav() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.bar} aria-label="Sections">
      {ITEMS.map((item) => {
        const active = pathname === item.to;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={active ? styles.linkActive : styles.link}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
