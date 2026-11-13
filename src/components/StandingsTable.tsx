import { useStandings } from '../lib/useStandings';
import type { LeagueStandings } from '../lib/espn';
import s from './StandingsTable.module.css';

/*
 * Newspaper-style league standings. One panel = one league, grouped the way the
 * league groups itself (divisions for MLB/NFL/NHL, conferences otherwise), with
 * the Seattle club's row picked out. Client-hydrated: the prerendered HTML is a
 * static "loading" panel, the table fills in after hydration (spec §2).
 */

function Tables({ league }: { league: LeagueStandings }) {
  return (
    <div className={s.groups}>
      {league.groups.map((g) => (
        <table className={s.table} key={g.name}>
          <caption className={s.caption}>{g.name}</caption>
          <thead>
            <tr>
              <th className={s.team} scope="col">
                Team
              </th>
              {league.columns.map((c) => (
                <th className={s.num} scope="col" key={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {g.rows.map((r) => (
              <tr className={r.ours ? s.ours : undefined} key={r.teamId || r.name}>
                <th className={s.team} scope="row">
                  {r.name}
                </th>
                {r.cells.map((v, i) => (
                  <td className={s.num} key={i}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

export default function StandingsPanel({
  leagueKey,
  title,
  heading = 'h3',
}: {
  /** From leagueKeyOf(team), e.g. "baseball/mlb". null → nothing to show. */
  leagueKey: string | null;
  /** Optional heading for the panel, e.g. "American & National League". */
  title?: string;
  /** Heading level for `title`, so pages keep a sane outline. */
  heading?: 'h2' | 'h3';
}) {
  const { data, loading } = useStandings(leagueKey);
  const Heading = heading;

  if (!leagueKey) {
    return <p className={s.note}>No league standings yet.</p>;
  }

  return (
    <section className={s.panel} aria-label={title ?? 'Standings'}>
      {title && <Heading className={s.title}>{title}</Heading>}
      {loading && !data && <p className={s.note}>Loading standings…</p>}
      {data?.status === 'unavailable' && (
        <p className={s.note}>Standings are unavailable right now. Check back shortly.</p>
      )}
      {data?.status === 'ok' && (
        <>
          {data.season && <div className={s.season}>{data.season} season</div>}
          <Tables league={data} />
        </>
      )}
    </section>
  );
}
