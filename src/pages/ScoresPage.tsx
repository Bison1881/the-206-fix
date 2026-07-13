import { TEAMS, type Team } from '../lib/teams';
import { useScores } from '../lib/useScores';
import type { TeamScore, TeamStanding } from '../lib/espn';
import s from './ScoresPage.module.css';

/*
 * The /scores board (spec §6, §8) — the SCORES nav destination. Scores lead
 * (fuller per-team tiles over the same normalized data the ribbon uses), with
 * compact one-line standings beneath. Client-hydrated island over a static
 * skeleton, same as the ribbon: one shared fetch via useScores().
 */

const STATUS_LABEL: Record<TeamScore['status'], string> = {
  live: 'LIVE',
  final: 'FINAL',
  scheduled: 'NEXT',
  offseason: 'OFFSEASON',
  returning: 'RETURNING',
  unavailable: '—',
};

function Tile({ team, score }: { team: Team; score?: TeamScore }) {
  // Pre-hydration skeleton: name + muted placeholder, never blank (§5).
  if (!score) {
    return (
      <div className={s.tile}>
        <div className={s.tileHead}>
          <span className={s.name}>{team.name}</span>
        </div>
        <div className={s.line}>…</div>
      </div>
    );
  }

  const { status } = score;
  const hasScore = score.teamScore != null;
  const vs = score.opponent
    ? `${score.isHome ? 'vs' : '@'} ${score.opponent}`
    : '';

  return (
    <div className={s.tile}>
      <div className={s.tileHead}>
        {score.logoUrl && (
          <img
            className={s.logo}
            src={score.logoUrl}
            alt=""
            width={28}
            height={28}
            loading="lazy"
          />
        )}
        <span className={s.name}>{team.name}</span>
        <span className={status === 'live' ? s.badgeLive : s.badge}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {hasScore ? (
        <div className={s.scoreRow}>
          <span className={s.score}>
            {score.teamScore}
            <span className={s.dash}>–</span>
            {score.oppScore}
          </span>
          {vs && <span className={s.vs}>{vs}</span>}
        </div>
      ) : (
        <div className={s.line}>
          {status === 'scheduled' && vs ? `${score.detail} · ${vs}` : score.detail}
        </div>
      )}

      {/* Under a score, the detail carries the live/final nuance ("Bot 7",
          "Final/10"). Scheduled tiles already show the time in the line above. */}
      {hasScore && score.detail && <div className={s.detail}>{score.detail}</div>}

      {score.series?.summary && (
        <div className={s.series}>{score.series.summary}</div>
      )}
    </div>
  );
}

function StandingRow({ team, standing }: { team: Team; standing?: TeamStanding }) {
  const parts = [standing?.record, standing?.standingSummary].filter(Boolean);
  return (
    <li className={s.standRow}>
      <span className={s.standTeam}>{team.name}</span>
      <span className={s.standInfo}>{parts.length ? parts.join(' · ') : '—'}</span>
    </li>
  );
}

export default function ScoresPage() {
  const { scores, standings } = useScores();
  const scoreByKey = new Map(scores.map((x) => [x.key, x]));
  const standByKey = new Map(standings.map((x) => [x.key, x]));

  return (
    <div className={s.page}>
      <div className={s.banner}>Scoreboard</div>
      <div className={s.deck}>
        Live scores, next games, and standings for all seven Seattle clubs —
        refreshing on their own while a game is on.
      </div>
      <hr className={s.rule} />

      <div className={s.grid}>
        {TEAMS.map((t) => (
          <Tile key={t.id} team={t} score={scoreByKey.get(t.id)} />
        ))}
      </div>

      <h2 className={s.standHead}>Standings</h2>
      <ul className={s.standList}>
        {TEAMS.map((t) => (
          <StandingRow key={t.id} team={t} standing={standByKey.get(t.id)} />
        ))}
      </ul>
    </div>
  );
}
