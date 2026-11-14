import { useStandings } from '../lib/useStandings';
import type { LeagueStandings } from '../lib/espn';
import { fmtBack, fmtBackLong, type PlayoffPicture } from '../lib/playoffs';
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

/** "Seattle Seahawks: ..." sentence for where the Seattle club stands in the race. */
function standingLine(p: PlayoffPicture): string | null {
  const o = p.ours;
  if (!o) return null;
  const where = o.unit ? ` in the ${o.unit}` : '';
  const gap =
    o.back === 0
      ? 'level with the last spot but behind on tiebreakers'
      : `${fmtBackLong(p.kind, o.back ?? 0)} behind the last spot`;
  if (p.final) {
    return o.in
      ? `${o.name}: made the playoffs as the No. ${o.seed} seed${where}.`
      : `${o.name}: missed the playoffs, finishing No. ${o.seed}${where}, ${gap}.`;
  }
  return o.in
    ? `${o.name}: in the field as the No. ${o.seed} seed${where}.`
    : `${o.name}: outside the field at No. ${o.seed}${where}, ${gap}.`;
}

function PlayoffPictureView({
  picture: p,
  heading,
  leagueKey,
}: {
  picture: PlayoffPicture;
  heading: 'h3' | 'h4';
  leagueKey: string;
}) {
  const Heading = heading;
  const cols = p.kind === 'points' ? 5 : 4; // seed, team, record, (points), back
  const line = standingLine(p);
  // Baseball calls it the post season; everyone else, the playoffs.
  const title = leagueKey === 'baseball/mlb' ? 'Post season' : 'Playoffs';
  return (
    <section className={s.pick} aria-label={title}>
      <Heading className={s.pickTitle}>{title}</Heading>
      {line && <p className={s.pickOurs}>{line}</p>}
      <div className={s.groups}>
        {p.units.map((u) => (
          <table className={s.table} key={u.name || 'league'}>
            <caption className={s.caption}>{u.name || 'League'}</caption>
            <thead>
              <tr>
                <th className={s.seed} scope="col" aria-label="Seed">
                  #
                </th>
                <th className={s.team} scope="col">
                  Team
                </th>
                <th className={s.num} scope="col">
                  Record
                </th>
                {p.kind === 'points' && (
                  <th className={s.num} scope="col">
                    Pts
                  </th>
                )}
                <th className={s.num} scope="col">
                  Back
                </th>
              </tr>
            </thead>
            <tbody>
              {u.field.map((t) => (
                <tr className={t.ours ? s.ours : undefined} key={t.teamId || t.name}>
                  <td className={s.seed}>{t.seed}</td>
                  <th className={s.team} scope="row">
                    {t.name}
                  </th>
                  <td className={s.num}>{t.record}</td>
                  {p.kind === 'points' && <td className={s.num}>{t.pts ?? '–'}</td>}
                  <td className={s.num} />
                </tr>
              ))}
            </tbody>
            <tbody className={s.bubble}>
              <tr>
                <th className={s.bubbleHead} colSpan={cols} scope="colgroup">
                  {p.final ? 'Just missed' : 'On the bubble'}
                </th>
              </tr>
              {u.bubble.map((t) => (
                <tr className={t.ours ? s.ours : undefined} key={t.teamId || t.name}>
                  <td className={s.seed}>{t.seed}</td>
                  <th className={s.team} scope="row">
                    {t.name}
                  </th>
                  <td className={s.num}>{t.record}</td>
                  {p.kind === 'points' && <td className={s.num}>{t.pts ?? '–'}</td>}
                  <td className={s.num}>{fmtBack(t.back ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
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
          {data.picture && (
            <PlayoffPictureView picture={data.picture} heading={heading === 'h2' ? 'h3' : 'h4'} leagueKey={leagueKey} />
          )}
        </>
      )}
    </section>
  );
}
