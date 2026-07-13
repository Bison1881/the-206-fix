import { TEAMS } from '../lib/teams';
import { useScores } from '../lib/useScores';
import type { TeamScore } from '../lib/espn';
import styles from './RibbonSlot.module.css';

/*
 * The always-present score ribbon — one compact line per team in the shared
 * shell, on every page (spec §6). It's a client-hydrated island: the
 * prerendered HTML ships the team-name skeleton (score store is empty during
 * SSG), then useScores() fetches on mount and this hydrates with live data.
 * Terse by design; the full context lives on /scores.
 */

function monthDay(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Compact status text for a single ribbon cell. Never empty (§5).
function cellText(s?: TeamScore): string {
  if (!s) return '—'; // skeleton / pre-hydration
  switch (s.status) {
    case 'live':
    case 'final':
      return s.teamScore != null ? `${s.teamScore}–${s.oppScore}` : s.detail ?? '';
    case 'scheduled':
      return s.detail ?? 'Next';
    case 'offseason':
      return s.startDate ? `Next ${monthDay(s.startDate)}` : 'Off';
    case 'returning':
      return 'Returning';
    case 'unavailable':
    default:
      return 'N/A';
  }
}

export default function RibbonSlot() {
  const { scores } = useScores();
  const byKey = new Map(scores.map((s) => [s.key, s]));

  return (
    <div className={styles.ribbon} aria-label="Scoreboard">
      {TEAMS.map((t) => {
        const s = byKey.get(t.id);
        const dim =
          !s ||
          s.status === 'offseason' ||
          s.status === 'returning' ||
          s.status === 'unavailable';
        return (
          <div className={styles.r} key={t.id}>
            <span className={styles.tm}>{t.abbr}</span>
            <span className={dim ? styles.dim : styles.val}>{cellText(s)}</span>
            {s?.status === 'live' && <span className={styles.live}>LIVE</span>}
            {s?.status === 'final' && <span className={styles.fin}>F</span>}
          </div>
        );
      })}
    </div>
  );
}
