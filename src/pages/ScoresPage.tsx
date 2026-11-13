import { Link } from 'react-router-dom';
import { TEAMS, type Team } from '../lib/teams';
import { useScores } from '../lib/useScores';
import { boxHref, leagueCodeOf, type TeamScore } from '../lib/espn';
import PageMeta from '../components/PageMeta';
import s from './ScoresPage.module.css';

/*
 * The /scores board (spec §6, §8) — the SCORES nav destination: fuller per-team
 * tiles over the same normalized data the ribbon uses. A live or just-finished
 * game links to its box score (/box); league tables live on /standings.
 * Client-hydrated island over a static skeleton, same as the ribbon: scores
 * share one fetch via useScores().
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

      {score.eventId && leagueCodeOf(team) && (
        <Link className={s.boxLink} to={boxHref(leagueCodeOf(team)!, score.eventId)}>
          Box score →
        </Link>
      )}
    </div>
  );
}

export default function ScoresPage() {
  const { scores } = useScores();
  const scoreByKey = new Map(scores.map((x) => [x.key, x]));

  return (
    <div className={s.page}>
      <PageMeta
        title="Scoreboard"
        description="Live scores and next games for all seven Seattle clubs — Mariners, Seahawks, Kraken, Sonics, Sounders, Storm and Reign — on one board, with box scores."
        path="/scores"
      />
      <h1 className={s.banner}>Scoreboard</h1>
      <div className={s.deck}>
        Live scores and next games for all seven Seattle clubs — refreshing on
        their own while a game is on.
      </div>
      <hr className={s.rule} />

      <div className={s.grid}>
        {TEAMS.map((t) => (
          <Tile key={t.id} team={t} score={scoreByKey.get(t.id)} />
        ))}
      </div>

      <p className={s.more}>
        <Link to="/standings">League standings →</Link>
      </p>
    </div>
  );
}
