import { Link, useLocation } from 'react-router-dom';
import { TEAMS } from '../lib/teams';
import styles from './SectionNav.module.css';

/*
 * Primary navigation — a vintage newspaper section-index line, built into the
 * shared shell so it rides under the masthead on every page. Deliberately ~5
 * top-level sections; TEAMS routes to the /teams section front rather than
 * listing all seven clubs inline. Secondary/utility links live in the footer;
 * the front-page "Inside this edition" strip is a teaser, not nav.
 */
const ITEMS = [
  { label: 'Scores', to: '/' }, // the front-page scoreboard lives on home
  { label: 'Teams', to: '/teams' },
  { label: 'This Day', to: '/this-day' },
  { label: 'Almanac', to: '/almanac' },
  { label: 'Highlights', to: '/highlights' },
];

const TEAM_PATHS = new Set(TEAMS.map((t) => `/${t.id}`));

export default function SectionNav() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.bar} aria-label="Sections">
      {ITEMS.map((item) => {
        // TEAMS stays lit on the index and on any individual team page.
        const active =
          item.to === '/teams'
            ? pathname === '/teams' || TEAM_PATHS.has(pathname)
            : pathname === item.to;

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
