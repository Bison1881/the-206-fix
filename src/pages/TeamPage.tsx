import { LEAGUE_TITLE, type Team } from '../lib/teams';
import { leagueKeyOf } from '../lib/espn';
import { teamWire } from '../lib/feeds';
import { useScores } from '../lib/useScores';
import Wire from '../components/Wire';
import StandingsPanel from '../components/StandingsTable';
import RecentResults from '../components/RecentResults';
import Schedule from '../components/Schedule';
import ScoreBoard from '../components/boards/ScoreBoard';
import { InjuryReport, RosterMoves, SeasonLeaders } from '../components/ClubDesk';
import PageMeta from '../components/PageMeta';
import s from './scaffold.module.css';
import t from './TeamPage.module.css';

/*
 * A club's page: everything about the club in one place. The game (its own
 * scoreboard), the schedule, the injury report, season leaders, roster moves,
 * recent results, the league table, and last, the coverage from around the web.
 * The front page keeps the articles; the club's information lives here. Every
 * panel but the wire is client-fetched and drops out quietly when its feed has
 * nothing (MLS and NWSL have no injury or transaction data, the Sonics no feed).
 */
export default function TeamPage({ team }: { team: Team }) {
  const items = teamWire(team.id);
  const leagueKey = leagueKeyOf(team);
  const { scores } = useScores();
  const score = scores.find((x) => x.key === team.id);

  return (
    <div className={s.page}>
      <PageMeta
        title={`Seattle ${team.name}`}
        description={`Seattle ${team.name}: scores, schedule, injury report, season leaders, standings and news from around the web, on The 206 Fix.`}
        path={`/${team.id}`}
      />
      <span className={s.badge}>Seattle</span>
      <h1 className={s.banner}>{team.name}</h1>
      <hr className={s.rule} />

      <div className={t.board}>
        <ScoreBoard team={team} score={score} />
      </div>

      <div className={t.pair}>
        <Schedule team={team} />
        <InjuryReport team={team} />
      </div>

      <SeasonLeaders team={team} />

      <div className={t.pair}>
        <RecentResults team={team} />
        <RosterMoves team={team} />
      </div>

      {leagueKey && (
        <div className={t.standings}>
          <StandingsPanel
            leagueKey={leagueKey}
            title={`${LEAGUE_TITLE[leagueKey]} standings`}
            heading="h2"
          />
        </div>
      )}

      <hr className={s.rule} />
      <h2 className={t.wireHead}>The Wire</h2>
      <div className={t.deck}>
        The latest {team.name} coverage from around the web. Every headline links out to its source.
      </div>
      <Wire items={items} />
    </div>
  );
}
