import type { Team } from './teams';
import type { UpcomingGame } from './espn';

/*
 * A club's remaining schedule as an .ics file. Times go out in UTC, so the
 * viewer's calendar shows them in their own zone. A game with no set time becomes
 * an all-day entry on its published date. It is a snapshot taken at download: ESPN
 * moves kickoff times, and a downloaded file does not follow them.
 */

const HOURS: Record<string, number> = { baseball: 3, football: 3, hockey: 2.5, basketball: 2.5, soccer: 2 };

const pad = (n: number) => String(n).padStart(2, '0');

const utc = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

const day = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function buildIcs(team: Team, games: UpcomingGame[], now = new Date()): string {
  const hours = HOURS[team.sport] ?? 3;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The 206 Fix//Schedule//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(`Seattle ${team.name}`)}`,
  ];
  for (const g of games) {
    const start = new Date(g.startDate);
    if (Number.isNaN(start.getTime())) continue;
    const title = `${team.name} ${g.isHome ? 'vs' : 'at'} ${g.opponent}`;
    lines.push('BEGIN:VEVENT', `UID:${team.id}-${g.id}@the206fix.com`, `DTSTAMP:${utc(now)}`);
    if (g.timeTbd) {
      const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
      lines.push(`DTSTART;VALUE=DATE:${day(start)}`, `DTEND;VALUE=DATE:${day(next)}`, `SUMMARY:${esc(`${title} (time TBA)`)}`);
    } else {
      const end = new Date(start.getTime() + hours * 3_600_000);
      lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(end)}`, `SUMMARY:${esc(title)}`);
      // A heads-up an hour before, for the early-morning games.
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'TRIGGER:-PT1H', 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Hand the file to the browser as a download. */
export function downloadIcs(filename: string, ics: string): void {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
