import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Team } from '../lib/teams';
import { boxHref, fetchRecentResults, leagueCodeOf } from '../lib/espn';
import { useScores } from '../lib/useScores';
import { useBoxScore } from '../lib/useBoxScore';
import BoxScoreView from './BoxScoreView';
import s from './LatestBoxScore.module.css';

/*
 * The club's most current box score, in full, right under its scoreboard: the
 * game in progress or just finished when the scoreboard has one, otherwise the
 * last final. Client-only, like the scoreboard it follows: the prerender and
 * first client render are empty, and a box score that can't be loaded simply
 * isn't shown.
 */
export default function LatestBoxScore({ team }: { team: Team }) {
  const code = leagueCodeOf(team);
  const { scores, loading } = useScores();
  const board = scores.find((x) => x.key === team.id);
  const boardId = board?.status === 'live' || board?.status === 'final' ? board.eventId : undefined;

  // Between games the scoreboard shows the next game, so fall back to the last final.
  const [lastFinal, setLastFinal] = useState<string | null>(null);
  const needFallback = !!code && !loading && !boardId;
  useEffect(() => {
    if (!needFallback) return;
    let cancelled = false;
    void fetchRecentResults(team, 1).then((r) => {
      if (!cancelled) setLastFinal(r?.[0]?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [needFallback, team]);

  const id = boardId ?? (needFallback ? lastFinal : null);
  const { box } = useBoxScore(code, id ?? null);
  if (!code || !id || !box || box.status !== 'ok') return null;

  return (
    <section className={s.panel} aria-label={`${team.name} latest box score`}>
      <h2 className={s.title}>{box.state === 'in' ? 'Live box score' : 'Latest box score'}</h2>
      <BoxScoreView box={box} titleAs="h3" />
      <Link className={s.full} to={boxHref(code, id)}>
        Open full page →
      </Link>
    </section>
  );
}
