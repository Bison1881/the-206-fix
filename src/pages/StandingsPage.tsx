import { useState } from 'react';
import { TEAMS, LEAGUE_TITLE, type TeamKey } from '../lib/teams';
import { useScores } from '../lib/useScores';
import { leagueKeyOf, type TeamScore } from '../lib/espn';
import PageMeta from '../components/PageMeta';
import StandingsPanel from '../components/StandingsTable';
import s from './StandingsPage.module.css';

/*
 * /standings — every Seattle club's league table, one tab per club. Split out
 * of /scores so the scoreboard stays a board; this page is the reference.
 * Client-hydrated over a static skeleton: tables load per league on demand
 * (useStandings), and the default tab follows whichever club is in action.
 */

// Teams that have a league table (the Sonics don't until there's a real club).
const STANDINGS_TEAMS = TEAMS.filter((t) => leagueKeyOf(t) !== null);
const IN_SEASON: TeamScore['status'][] = ['live', 'final', 'scheduled'];

export default function StandingsPage() {
  const { scores } = useScores();
  const scoreByKey = new Map(scores.map((x) => [x.key, x]));

  // Default to a club that's actually playing; the reader's pick wins once made.
  // Until scores arrive there's no honest default, so we wait rather than fetch
  // a league the page is about to swap away from.
  const [picked, setPicked] = useState<TeamKey | null>(null);
  const auto =
    STANDINGS_TEAMS.find((t) => IN_SEASON.includes(scoreByKey.get(t.id)?.status as TeamScore['status'])) ??
    STANDINGS_TEAMS[0];
  const selected = picked
    ? STANDINGS_TEAMS.find((t) => t.id === picked)
    : scores.length
      ? auto
      : undefined;
  const key = selected ? leagueKeyOf(selected) : null;

  return (
    <div className={s.page}>
      <PageMeta
        title="Standings"
        description="League standings for every Seattle club: Mariners (MLB), Seahawks (NFL), Kraken (NHL), Sounders (MLS), Storm (WNBA) and Reign (NWSL)."
        path="/standings"
      />
      <h1 className={s.banner}>Standings</h1>
      <hr className={s.rule} />

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
        <p className={s.note}>Loading standings…</p>
      )}
    </div>
  );
}
