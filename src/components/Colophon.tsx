import { Link } from 'react-router-dom';
import { TEAMS } from '../lib/teams';
import styles from './Colophon.module.css';

/*
 * Footer. Mockup colophon = wordmark + tagline. Because the site is multi-page
 * (the mockup was a single page), a minimal footer nav is added so every route
 * is crawlable/reachable. Primary nav placement is still an open design call
 * (the plan's "Inside this edition" strip is the intended mechanism, later phase).
 */
export default function Colophon() {
  return (
    <footer className={styles.colophon}>
      <nav className={styles.nav} aria-label="Site">
        <Link to="/">Front Page</Link>
        <Link to="/scores">Scores</Link>
        <Link to="/this-day">This Day</Link>
        <Link to="/almanac">The Almanac</Link>
        <Link to="/highlights">Highlights</Link>
        {TEAMS.map((t) => (
          <Link to={`/${t.id}`} key={t.id}>{t.name}</Link>
        ))}
        <Link to="/privacy">Privacy</Link>
      </nav>
      <div className={styles.mark}>The 206 Fix</div>
      <div className={styles.tag}>aggregated · curated · a Seattle sports desk</div>
    </footer>
  );
}
