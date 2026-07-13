/*
 * The one shared scoreboard store (spec §6, §7). Both surfaces — the RibbonSlot
 * in the shell and the /scores board — read from here via useScores(), so the
 * data is fetched ONCE and the two never drift or double-hit ESPN.
 *
 * It's a module-level singleton behind useSyncExternalStore:
 *   - getServerSnapshot returns the empty skeleton, so SSG prerenders a static
 *     loading state and the live fetch only happens on the client (§2).
 *   - The first subscriber triggers the load; the last to unsubscribe tears
 *     down polling and listeners.
 *   - Polling runs ONLY while a game is live (~45s), pauses on a hidden tab
 *     (Page Visibility), and never runs when there are no live games (§7).
 */

import { useSyncExternalStore } from 'react';
import { TEAMS } from './teams';
import {
  fetchTeamScore,
  fetchTeamStanding,
  type TeamScore,
  type TeamStanding,
} from './espn';

export interface ScoresState {
  scores: TeamScore[];
  standings: TeamStanding[];
  loading: boolean;
  lastFetched: number | null;
}

const TTL_MS = 25_000; // dedupe near-simultaneous mounts of both surfaces
const POLL_MS = 45_000; // live-refresh cadence while a game is in progress

// A single stable state object; replaced (not mutated) on every update so
// useSyncExternalStore sees a new reference and re-renders.
let state: ScoresState = { scores: [], standings: [], loading: true, lastFetched: null };

const subscribers = new Set<() => void>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let scoresInFlight: Promise<void> | null = null;
let standingsLoaded = false;

function emit() {
  for (const cb of subscribers) cb();
}

function setState(patch: Partial<ScoresState>) {
  state = { ...state, ...patch };
  emit();
}

function anyLive() {
  return state.scores.some((s) => s.status === 'live');
}

/** Pull all seven scores. `force` bypasses the short TTL used to dedupe loads. */
function loadScores(force: boolean): Promise<void> {
  if (scoresInFlight) return scoresInFlight;
  if (!force && state.lastFetched && Date.now() - state.lastFetched < TTL_MS) {
    return Promise.resolve();
  }
  scoresInFlight = Promise.all(TEAMS.map(fetchTeamScore))
    .then((scores) => setState({ scores, loading: false, lastFetched: Date.now() }))
    .finally(() => {
      scoresInFlight = null;
    });
  return scoresInFlight;
}

/** Standings change slowly — fetched once, not on every live poll (§8). */
function loadStandings() {
  if (standingsLoaded) return;
  standingsLoaded = true;
  Promise.all(TEAMS.map(fetchTeamStanding))
    .then((standings) => setState({ standings }))
    .catch(() => {
      standingsLoaded = false;
    });
}

function clearTimer() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

/** Schedule the next poll, but only when it's actually warranted (§7). */
function scheduleNext() {
  clearTimer();
  if (subscribers.size === 0) return; // nothing mounted
  if (typeof document !== 'undefined' && document.hidden) return; // tab hidden
  if (!anyLive()) return; // no live game → idle, no polling
  pollTimer = setTimeout(async () => {
    await loadScores(true);
    scheduleNext();
  }, POLL_MS);
}

function onVisibility() {
  if (document.hidden) {
    clearTimer(); // pause while hidden
  } else {
    loadScores(false).then(scheduleNext); // resume: fresh pull + reschedule
  }
}

function start() {
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }
  loadScores(false).then(scheduleNext);
  loadStandings();
}

function stop() {
  clearTimer();
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibility);
  }
}

function subscribe(cb: () => void): () => void {
  subscribers.add(cb);
  if (subscribers.size === 1) start();
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0) stop();
  };
}

const getSnapshot = () => state;

/**
 * Subscribe to the shared scoreboard state. Safe to call from any number of
 * components — they all share one fetch and one polling loop.
 */
export function useScores(): ScoresState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
