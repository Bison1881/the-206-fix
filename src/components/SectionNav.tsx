import { Link, useLocation } from "react-router-dom";
import { TEAMS } from "../lib/teams";
import styles from "./SectionNav.module.css";

/*
 * Primary navigation — a vintage newspaper section-index line, built into the
 * shared shell so it rides under the masthead on every page. Home, Scores, Standings and Results;
 * the footer repeats them, and the two should stay in step.
 *
 * A second line under it lists the seven clubs: each club's page holds its
 * scoreboard, schedule, injuries, leaders and standings, so the pages need to be
 * one click from anywhere. (Teams, This Day, Almanac and Highlights were taken
 * out of the main bar in 2026-08; the club row replaces the old Teams entry.)
 */
const ITEMS = [
  { label: "Home", to: "/" }, // the front page: the day's news
  { label: "Scores", to: "/scores" }, // the live scoreboard board (Phase 1)
  { label: "Standings", to: "/standings" }, // league tables, one tab per club
  { label: "Results", to: "/results" }, // last ten games per club, with box scores
];

export default function SectionNav() {
  const { pathname } = useLocation();

  return (
    <>
      <nav className={styles.bar} aria-label="Sections">
        {ITEMS.map((item) => {
          const active = pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={active ? styles.linkActive : styles.link}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <nav className={styles.clubs} aria-label="Clubs">
        {TEAMS.map((team) => {
          const to = `/${team.id}`;
          const active = pathname === to;
          return (
            <Link
              key={team.id}
              to={to}
              className={active ? styles.clubActive : styles.club}
              aria-current={active ? "page" : undefined}
            >
              {team.name}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
