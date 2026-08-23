import { Link } from 'react-router-dom';
import styles from './Colophon.module.css';

/*
 * Footer. Mockup colophon = wordmark + tagline. Because the site is multi-page
 * (the mockup was a single page), a minimal footer nav is added so every route
 * is crawlable/reachable.
 *
 * DORMANT 2026-08: This Day, The Almanac, Highlights and the seven per-team
 * links were removed here. The team pages stay crawlable via Around the Teams
 * on the front page; the three Phase 3 scaffolds are now noindexed and out of
 * the sitemap, so they no longer need a crawl path. Restore from git history
 * (commit 3f3c213^) along with the SectionNav entries.
 */
export default function Colophon() {
  return (
    <footer className={styles.colophon}>
      <nav className={styles.nav} aria-label="Site">
        <Link to="/">Front Page</Link>
        <Link to="/scores">Scores</Link>
        <Link to="/privacy">Privacy</Link>
      </nav>
      <div className={styles.mark}>The 206 Fix</div>
      <div className={styles.tag}>aggregated · curated · a Seattle sports desk</div>
    </footer>
  );
}
