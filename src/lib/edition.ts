/*
 * Edition metadata for the folio line, pinned to Seattle time.
 * Computed when the page renders; under vite-react-ssg that is build time,
 * so the static HTML ships stamped with the build's "edition."
 *
 *   Volume  = Roman numeral, years since the 2026 launch (2026 = I).
 *   Number  = day-of-year in Seattle.
 *   Edition = Morning before noon Seattle, Evening after.
 */

const LAUNCH_YEAR = 2026;
const TZ = 'America/Los_Angeles';

function seattleParts(date: Date) {
  // en-US formatting in the Seattle zone, broken into addressable parts.
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return parts;
}

function toRoman(n: number): string {
  const table: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let out = '';
  let rem = Math.max(1, n);
  for (const [value, sym] of table) {
    while (rem >= value) {
      out += sym;
      rem -= value;
    }
  }
  return out;
}

function dayOfYearSeattle(date: Date): number {
  // Day-of-year from the Seattle-local Y/M/D, DST-safe (date math in UTC).
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date); // "2026-07-12"
  const [y, m, d] = ymd.split('-').map(Number);
  const start = Date.UTC(y, 0, 0);
  const today = Date.UTC(y, m - 1, d);
  return Math.round((today - start) / 86_400_000);
}

export interface Edition {
  dateLine: string; // "SUN · JUL 12, 2026"
  volume: string;   // "I"
  number: number;   // 193
  edition: 'Morning' | 'Evening';
  place: string;    // "SEATTLE"
}

export function getEdition(now: Date = new Date()): Edition {
  const p = seattleParts(now);
  const year = Number(p.year);
  const hour = Number(p.hour);

  const dateLine =
    `${p.weekday} · ${p.month} ${p.day}, ${p.year}`.toUpperCase();

  return {
    dateLine,
    volume: toRoman(year - LAUNCH_YEAR + 1),
    number: dayOfYearSeattle(now),
    edition: hour < 12 ? 'Morning' : 'Evening',
    place: 'SEATTLE',
  };
}
