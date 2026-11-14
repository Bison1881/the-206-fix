import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Team } from '../lib/teams';
import { boxHref, fetchRecentResults, fetchUpcoming, leagueCodeOf } from '../lib/espn';
import { useScores } from '../lib/useScores';
import { useBoxScore } from '../lib/useBoxScore';
import BoxScoreView from './BoxScoreView';
import s from './LatestBoxScore.module.css';

/*
 * The club's box score, in full, right under its scoreboard. Which game:
 *   - a game in progress: that game, live;
 *   - for a while after a game ends: that game, final. How long depends on how often
 *     the sport plays: 48 hours for football and soccer (about weekly), 24 for hockey
 *     (twice a week), and for baseball and basketball (nearly daily) until the next
 *     game starts, since an empty box would otherwise be up most of the time;
 *   - after that: the next game's box score, empty, waiting for the game to be played
 *     (when there is no next game, as in the offseason, the last final stays up).
 * Client-only, like the scoreboard it follows: the prerender and first client
 * render are empty, and a box score that can't be loaded simply isn't shown.
 */

const HOUR = 60 * 60 * 1000;
const HOLD_MS: Record<string, number> = {
  football: 48 * HOUR,
  soccer: 48 * HOUR,
  hockey: 24 * HOUR,
  baseball: Infinity, // until the next game starts
  basketball: Infinity,
};
// The feed gives a game's start, not its end, so the hold counts from start plus a typical length.
const GAME_LENGTH_MS: Record<string, number> = {
  football: 3.5 * HOUR,
  baseball: 3.5 * HOUR,
  hockey: 2.75 * HOUR,
  basketball: 2.5 * HOUR,
  soccer: 2.25 * HOUR,
};

export default function LatestBoxScore({ team }: { team: Team }) {
  const code = leagueCodeOf(team);
  const { scores, loading } = useScores();
  const board = scores.find((x) => x.key === team.id);
  const liveId = board?.status === 'live' ? board.eventId : undefined;

  const [pickedId, setPickedId] = useState<string | null>(null);
  const ready = !!code && !loading && !liveId;
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void Promise.all([fetchRecentResults(team, 1), fetchUpcoming(team, 1)]).then(([results, upcoming]) => {
      if (cancelled) return;
      const last = results[0];
      const next = upcoming?.[0];
      const heldUntil = last ? Date.parse(last.date) + (GAME_LENGTH_MS[team.sport] ?? 3 * HOUR) + (HOLD_MS[team.sport] ?? 48 * HOUR) : 0;
      setPickedId(last && (Date.now() < heldUntil || !next) ? last.id : next?.id ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, team]);

  const id = liveId ?? (ready ? pickedId : null);
  const { box } = useBoxScore(code, id ?? null);
  if (!code || !id || !box || box.status !== 'ok') return null;

  const title = box.state === 'in' ? 'Live box score' : box.state === 'pre' ? 'Next box score' : 'Latest box score';
  return (
    <section className={s.panel} aria-label={`${team.name} ${title.toLowerCase()}`}>
      <h2 className={s.title}>{title}</h2>
      <BoxScoreView box={box} titleAs="h3" />
      {box.state !== 'pre' && (
        <Link className={s.full} to={boxHref(code, id)}>
          Open full page →
        </Link>
      )}
    </section>
  );
}
