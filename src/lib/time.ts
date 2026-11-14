/*
 * Deterministic, timezone-stable formatting for build-time content. Feeds are
 * prerendered at build (Node) and hydrated in the browser (user's TZ); a
 * locale/TZ-dependent format would differ between the two and trigger a
 * hydration mismatch. Formatting from the ISO string via UTC getters yields
 * identical output in both places. (A few hours' UTC-vs-Pacific skew on a news
 * timestamp is an acceptable trade for hydration safety.)
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jul 13" — stable across server render and client hydration. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/* ── Game times: Seattle first, the viewer's own time as a second line ────────
 * Unlike the news timestamps above, game times come from a client-side fetch,
 * so they are never part of the prerendered HTML and can use real time zones. */

const SEATTLE = 'America/Los_Angeles';

export interface GameWhen {
  /** "SUN NOV 15 · 1:05 PM PST". Seattle's own clock; PST or PDT as the date requires. */
  line: string;
  /** "MON 7:05 AM AEST". Only when the viewer's clock differs from Seattle's. */
  local?: string;
}

const part = (parts: Intl.DateTimeFormatPart[], type: string): string =>
  parts.find((p) => p.type === type)?.value ?? '';

/**
 * Seattle date and time for a game, plus the viewer's time when it is not the same.
 * `tba` means the league has not set a time yet: show the date alone, never a made-up time.
 */
export function gameWhen(iso: string | null | undefined, tba = false): GameWhen | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;

  if (tba) {
    // A placeholder time can slide the date across a zone line, so name the day as given (UTC).
    const f = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
    return { line: `${f.format(d).replace(',', '')} · TIME TBA`.toUpperCase() };
  }

  const sea = new Intl.DateTimeFormat('en-US', {
    timeZone: SEATTLE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(d);
  const clock = `${part(sea, 'hour')}:${part(sea, 'minute')} ${part(sea, 'dayPeriod')}`;
  const line = `${part(sea, 'weekday')} ${part(sea, 'month')} ${part(sea, 'day')} · ${clock} ${part(sea, 'timeZoneName')}`.toUpperCase();

  // The viewer's own clock, in their own locale. Skip it when it reads the same as Seattle's.
  let local: string | undefined;
  try {
    const mine = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
    const parts = mine.formatToParts(d);
    const theirs = `${part(parts, 'weekday')} ${part(parts, 'hour')}:${part(parts, 'minute')} ${part(parts, 'dayPeriod')}`.toUpperCase();
    const seattleShort = `${part(sea, 'weekday')} ${clock}`.toUpperCase();
    if (theirs.replace(/\s+/g, ' ') !== seattleShort.replace(/\s+/g, ' ') && mine.resolvedOptions().timeZone !== SEATTLE) {
      local = mine.format(d).replace(',', '').toUpperCase();
    }
  } catch {
    /* no Intl support for the viewer's zone: Seattle time alone is fine */
  }
  return { line, local };
}

/** "SUN NOV 15" only, for list headings. Seattle's calendar day. */
export function gameDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('en-US', { timeZone: SEATTLE, weekday: 'short', month: 'short', day: 'numeric' }).formatToParts(d);
  return `${part(p, 'weekday')} ${part(p, 'month')} ${part(p, 'day')}`.toUpperCase();
}
