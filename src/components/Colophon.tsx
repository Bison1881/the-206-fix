import { Link } from "react-router-dom";
import { TEAMS } from "../lib/teams";
import styles from "./Colophon.module.css";

/*
 * Footer. Mockup colophon = wordmark + tagline. Because the site is multi-page
 * (the mockup was a single page), a minimal footer nav is added so every route
 * is crawlable/reachable.
 *
 * The seven club pages are linked here and in the top nav's club row, so every
 * page on the site stays one click from every other and crawlable. (This Day, The
 * Almanac and Highlights were removed in 2026-08: noindexed scaffolds that no
 * longer need a crawl path.)
 */
export default function Colophon() {
  return (
    <footer className={styles.colophon}>
      <nav className={styles.nav} aria-label="Site">
        <Link to="/">Home</Link>
        <Link to="/scores">Scores</Link>
        <Link to="/standings">Standings</Link>
        <Link to="/results">Results</Link>
      </nav>
      <nav className={styles.nav} aria-label="Club pages">
        {TEAMS.map((team) => (
          <Link key={team.id} to={`/${team.id}`}>
            {team.name}
          </Link>
        ))}
      </nav>
      <div className={styles.mark}>The 206 Fix</div>
      <div className={styles.tag}>A Seattle Sports Desk</div>
    </footer>
  );
}
