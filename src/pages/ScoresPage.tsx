import { useState } from 'react';
import { TEAMS, LEAGUE_TITLE, type Team, type TeamKey } from '../lib/teams';
import { useScores } from '../lib/useScores';
import { leagueKeyOf, type TeamScore } from '../lib/espn';
import PageMeta from '../components/PageMeta';
import StandingsPanel from '../components/StandingsTable';
import s from './ScoresPage.module.css';

/*
 * The /scores board (spec §6, §8) — the SCORES nav destination. Scores lead
 * (fuller per-team tiles over the same normalized data the ribbon uses), with
 * full league standings beneath: pick a club, see its whole league. Client-
 * hydrated island over a static skeleton, same as the ribbon: scores share one
 * fetch via useScores(); standings load per league on demand (useStandings).
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

// Teams that have a league table (the Sonics don't until there's a real club).
const STANDINGS_TEAMS = TEAMS.filter((t) => leagueKeyOf(t) !== null);
const IN_SEASON: TeamScore['status'][] = ['live', 'final', 'scheduled'];

export default function ScoresPage() {
  const { scores } = useScores();
  const scoreByKey = new Map(scores.map((x) => [x.key, x]));

  // Default to a club that's actually playing; the reader's pick wins once made.
  // Until scores arrive there's no honest default, so we wait rather than fetch
  // a league the page is about to swap away from.
  const [picked, setPicked] = useState<TeamKey | null>(null);
  const auto =
    STANDINGS_TEAMS.find((t) => IN_SEASON.includes(scoreByKey.get(t.id)?.status as TeamScore['status']))
      ?? STANDINGS_TEAMS[0];
  const selected = picked
    ? STANDINGS_TEAMS.find((t) => t.id === picked)
    : scores.length
      ? auto
      : undefined;
  const key = selected ? leagueKeyOf(selected) : null;

  return (
    <div className={s.page}>
      <PageMeta
        title="Scoreboard"
        description="Live scores, next games and standings for all seven Seattle clubs — Mariners, Seahawks, Kraken, Sonics, Sounders, Storm and Reign — on one board."
        path="/scores"
      />
      <h1 className={s.banner}>Scoreboard</h1>
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
      <div className={s.tabs} role="tablist" aria-label="Choose a club to see its league standings">
        {STANDINGS_TEAMS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={selected?.id === t.id}
            className={selected?.id === t.id ? s.tabOn : s.tab}
            onClick={() => setPicked(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      {key ? (
        <StandingsPanel leagueKey={key} title={LEAGUE_TITLE[key]} />
      ) : (
        <p className={s.standNote}>Loading standings…</p>
      )}
    </div>
  );
}
