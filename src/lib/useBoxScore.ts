import { useEffect, useState } from 'react';
import { fetchBoxScore, type BoxScore } from './espn';

/*
 * One game's box score, fetched on mount and refreshed every 30s while the game
 * is in progress (and the tab is visible). Client-only by construction: effects
 * never run during prerender, so the server and the first client render both
 * see `box: null` and hydration stays clean.
 */
const POLL_MS = 30_000;

export function useBoxScore(
  leagueCode: string | null,
  eventId: string | null,
): { box: BoxScore | null; loading: boolean } {
  const [box, setBox] = useState<BoxScore | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leagueCode || !eventId) {
      setBox(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setBox(null);
    setLoading(true);

    const load = async () => {
      const next = await fetchBoxScore(leagueCode, eventId);
      if (cancelled) return;
      // A failed refresh must not wipe a good box score already on screen.
      setBox((prev) => (next.status === 'ok' || !prev || prev.status !== 'ok' ? next : prev));
      setLoading(false);
      if (next.state === 'in') {
        timer = setTimeout(() => {
          if (document.visibilityState === 'visible') void load();
          else timer = setTimeout(() => void load(), POLL_MS);
        }, POLL_MS);
      }
    };
    void load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [leagueCode, eventId]);

  return { box, loading };
}
