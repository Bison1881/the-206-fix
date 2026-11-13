import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Team } from '../lib/teams';
import { boxHref, fetchRecentResults, leagueCodeOf, type GameResult } from '../lib/espn';
import s from './RecentResults.module.css';

function fmt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/*
 * A club's last few finals, each linking to its box score. Client-fetched: the
 * prerender and first client render are both empty, so nothing shifts or
 * mismatches on hydration, and a failed fetch simply renders nothing.
 */
export default function RecentResults({ team }: { team: Team }) {
  const code = leagueCodeOf(team);
  const [results, setResults] = useState<GameResult[] | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    void fetchRecentResults(team, 5).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [team, code]);

  if (!code || !results || results.length === 0) return null;

  return (
    <section className={s.panel} aria-label="Recent results">
      <h2 className={s.title}>Recent results</h2>
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
    </section>
  );
}
