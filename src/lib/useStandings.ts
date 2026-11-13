/*
 * Per-league standings store. Unlike the scoreboard (useScores) this is
 * fetched on demand — only for the league the reader is actually looking at —
 * and cached, because standings change slowly (once or twice a day) and a
 * full table is a big payload. No polling.
 *
 * Same SSG rule as the scoreboard: the server snapshot is a constant "loading"
 * state, so prerendered HTML is a static skeleton and the live fetch only runs
 * in the browser after hydration.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { TEAMS, type Team } from './teams';
import { fetchLeagueStandings, leagueKeyOf, type LeagueStandings } from './espn';

export interface StandingsState {
  data: LeagueStandings | null;
  loading: boolean;
}

const TTL_MS = 10 * 60 * 1000; // a good result stays fresh for 10 minutes
const RETRY_MS = 60 * 1000; // a failed one is retried after a minute

const LOADING: StandingsState = { data: null, loading: true };
const IDLE: StandingsState = { data: null, loading: false };

interface Entry {
  state: StandingsState;
  freshUntil: number;
  inFlight: boolean;
}

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((cb) => cb());
}

function ourTeamId(key: string): string | undefined {
  return TEAMS.find((t) => leagueKeyOf(t) === key)?.espnTeamId;
}

function load(key: string) {
  const e = entries.get(key);
  if (e?.inFlight) return;
  if (e && Date.now() < e.freshUntil) return;

  const entry: Entry = e ?? { state: LOADING, freshUntil: 0, inFlight: false };
  entry.inFlight = true;
  entries.set(key, entry);

  fetchLeagueStandings(key, ourTeamId(key)).then((data) => {
    entry.inFlight = false;
    entry.freshUntil = Date.now() + (data.status === 'ok' ? TTL_MS : RETRY_MS);
    // Keep showing an older good table if a refresh fails.
    const keep = data.status !== 'ok' && entry.state.data?.status === 'ok';
    if (!keep) entry.state = { data, loading: false };
    emit(key);
  });
}

/** Standings for a league key (see leagueKeyOf), or idle when key is null. */
export function useStandings(key: string | null): StandingsState {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => {};
      let set = listeners.get(key);
      if (!set) listeners.set(key, (set = new Set()));
      set.add(cb);
      load(key);
      return () => {
        set!.delete(cb);
      };
    },
    [key],
  );
  const getSnapshot = useCallback(
    () => (key ? entries.get(key)?.state ?? LOADING : IDLE),
    [key],
  );
  const getServerSnapshot = useCallback(() => (key ? LOADING : IDLE), [key]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Convenience for pages that start from a team. */
export function useTeamStandings(team: Team): StandingsState {
  return useStandings(leagueKeyOf(team));
}
