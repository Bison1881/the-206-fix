/*
 * Per-club store for the club desk (leaders, injuries, roster moves). Fetched
 * on demand for the club page being viewed and cached: these change a few
 * times a day at most. No polling. Same SSG rule as the other stores: the
 * server snapshot is a constant "loading" state, so the prerendered page is a
 * static skeleton and the fetch only runs in the browser after hydration.
 */

import { useCallback, useSyncExternalStore } from 'react';
import type { Team } from './teams';
import { fetchClubDesk, hasClubDesk, type ClubDesk } from './espn';

export interface ClubDeskState {
  data: ClubDesk | null;
  loading: boolean;
}

const TTL_MS = 10 * 60 * 1000;

const LOADING: ClubDeskState = { data: null, loading: true };
const IDLE: ClubDeskState = { data: null, loading: false };

interface Entry {
  state: ClubDeskState;
  freshUntil: number;
  inFlight: boolean;
}

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function emit(id: string) {
  listeners.get(id)?.forEach((cb) => cb());
}

function load(team: Team) {
  const e = entries.get(team.id);
  if (e?.inFlight) return;
  if (e && Date.now() < e.freshUntil) return;

  const entry: Entry = e ?? { state: LOADING, freshUntil: 0, inFlight: false };
  entry.inFlight = true;
  entries.set(team.id, entry);

  fetchClubDesk(team).then((data) => {
    entry.inFlight = false;
    const allDown = data.leaders === null && data.injuries === null && data.moves === null;
    entry.freshUntil = Date.now() + (allDown ? 60_000 : TTL_MS);
    // Keep an older good result if a refresh comes back empty-handed.
    const keep = allDown && entry.state.data;
    if (!keep) entry.state = { data, loading: false };
    emit(team.id);
  });
}

export function useClubDesk(team: Team): ClubDeskState {
  const on = hasClubDesk(team);
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!on) return () => {};
      let set = listeners.get(team.id);
      if (!set) listeners.set(team.id, (set = new Set()));
      set.add(cb);
      load(team);
      return () => {
        set!.delete(cb);
      };
    },
    [on, team],
  );
  const getSnapshot = useCallback(() => (on ? entries.get(team.id)?.state ?? LOADING : IDLE), [on, team.id]);
  const getServerSnapshot = useCallback(() => (on ? LOADING : IDLE), [on]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
