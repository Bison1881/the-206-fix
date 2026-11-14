import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Team } from '../lib/teams';
import { boxHref, fetchRecentResults, leagueCodeOf, type GameResult } from '../lib/espn';
import s from './RecentResults.module.css';

function fmt(iso: string): string {
  const d = new Date(iso);
  // Seattle's calendar, not the reader's (see BoxScoreView).
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles' });
}

/*
 * A club's last few finals, each linking to its box score. Client-fetched: the
 * prerender and first client render are both empty, so nothing shifts or
 * mismatches on hydration, and a failed fetch simply renders nothing.
 */
export default function RecentResults({
  team,
  n = 5,
  title = 'Recent results',
  all = true,
  emptyNote,
}: {
  team: Team;
  n?: number;
  title?: string;
  /** Show the "All results" link (the club pages do; the results page itself does not). */
  all?: boolean;
  /** Shown when the fetch finished and there are no games yet. Without it, an empty club renders nothing. */
  emptyNote?: string;
}) {
  const code = leagueCodeOf(team);
  const [results, setResults] = useState<GameResult[] | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void fetchRecentResults(team, n).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [team, code, n]);

  if (!code || !results) return null;
  if (results.length === 0) return emptyNote ? <p className={s.empty}>{emptyNote}</p> : null;

  return (
    <section className={s.panel} aria-label="Recent results">
      {title && <h2 className={s.title}>{title}</h2>}
      <ul className={s.list}>
        {results.map((r) => (
          <li className={s.row} key={r.id}>
            <span className={s.date}>{fmt(r.date)}</span>
            <span className={r.outcome === 'W' ? s.win : s.loss}>{r.outcome}</span>
            <span className={s.game}>
              {r.isHome ? 'vs' : '@'} {r.opponent}
            </span>
            <span className={s.score}>
              {r.teamScore ?? '–'}–{r.oppScore ?? '–'}
            </span>
            <Link className={s.link} to={boxHref(code, r.id)}>
              Box score →
            </Link>
          </li>
        ))}
      </ul>
      {all && (
        <Link className={s.all} to="/results">
          All results →
        </Link>
      )}
    </section>
  );
}
