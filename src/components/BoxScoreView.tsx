import type { BoxLine, BoxScore, BoxTable } from '../lib/espn';
import s from './BoxScoreView.module.css';

/*
 * A newspaper box score: line score, (soccer) goals and cards, team comparison,
 * then each club's player tables. Pure presentation over the normalized
 * `BoxScore` — it never sees an ESPN object.
 */

function fmtDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function Name({ line }: { line: BoxLine }) {
  return (
    <>
      <span className={s.nameFull}>{line.name}</span>
      <span className={s.nameAbbr}>{line.abbr ?? line.name}</span>
    </>
  );
}

function LineScore({ box }: { box: BoxScore }) {
  if (!box.periodLabels.length) return null;
  const baseball = box.totalLabels.length === 3;
  const isFinal = box.state === 'post';
  const last = box.periodLabels.length - 1;

  return (
    <div className={s.scroll}>
      <table className={s.linescore}>
        <caption className={s.srOnly}>Line score</caption>
        <thead>
          <tr>
            <th scope="col" className={s.team}>
              <span className={s.srOnly}>Team</span>
            </th>
            {box.periodLabels.map((l, i) => (
              <th scope="col" className={s.num} key={`${l}-${i}`}>
                {l}
              </th>
            ))}
            {box.totalLabels.map((l, i) => (
              <th scope="col" className={i === 0 ? s.totalFirst : s.total} key={l}>
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {box.lines.map((line, row) => (
            <tr className={line.ours ? s.ours : undefined} key={line.teamId}>
              <th scope="row" className={s.team}>
                {line.logoUrl && (
                  <img className={s.logo} src={line.logoUrl} alt="" width={20} height={20} loading="lazy" />
                )}
                <Name line={line} />
              </th>
              {line.periods.map((p, i) => {
                // The home side doesn't bat in the 9th when it's already ahead.
                const x = baseball && isFinal && row === 1 && i === last && p === '' && line.winner;
                return (
                  <td className={s.num} key={i}>
                    {x ? 'x' : p}
                  </td>
                );
              })}
              {line.totals.map((t, i) => (
                <td className={i === 0 ? s.totalFirst : s.total} key={i}>
                  {t}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerTable({ t }: { t: BoxTable }) {
  return (
    <div className={s.scroll}>
      <table className={s.table}>
        <caption className={s.caption}>{t.title}</caption>
        <thead>
          <tr>
            <th scope="col" className={s.player}>
              <span className={s.srOnly}>Player</span>
            </th>
            {t.columns.map((c, i) => (
              <th scope="col" className={s.num} key={`${c}-${i}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={`${r.name}-${i}`}>
              <th scope="row" className={s.player}>
                {r.name}
                {r.pos && <span className={s.pos}> {r.pos}</span>}
              </th>
              {r.cells.map((c, j) => (
                <td className={s.num} key={j}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {t.totals && (
          <tfoot>
            <tr>
              <th scope="row" className={s.player}>
                Totals
              </th>
              {t.totals.map((c, j) => (
                <td className={s.num} key={j}>
                  {c}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export default function BoxScoreView({ box }: { box: BoxScore }) {
  const [away, home] = box.lines;
  const live = box.state === 'in';

  const meta = [fmtDate(box.date), box.venue, box.attendance ? `Att. ${box.attendance}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <article className={s.box}>
      <div className={s.kicker}>
        <span className={live ? s.statusLive : s.status}>{live ? 'LIVE' : box.statusText ?? ''}</span>
        {meta && <span className={s.meta}>{meta}</span>}
      </div>
      <h1 className={s.title}>
        {away?.name} <span className={s.at}>at</span> {home?.name}
      </h1>

      <LineScore box={box} />

      {box.events.length > 0 && (
        <section className={s.section} aria-label="Goals and cards">
          <h2 className={s.h2}>Goals &amp; Cards</h2>
          <ul className={s.events}>
            {box.events.map((e, i) => (
              <li key={i} className={e.kind === 'goal' ? s.goal : s.card}>
                <span className={s.clock}>{e.clock}</span>
                <span className={s.evTeam}>{e.teamAbbr}</span>
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {box.compare.length > 0 && away && home && (
        <section className={s.section} aria-label="Team comparison">
          <h2 className={s.h2}>Team Comparison</h2>
          <div className={s.scroll}>
            <table className={s.compare}>
              <thead>
                <tr>
                  <th scope="col" className={s.player}>
                    <span className={s.srOnly}>Statistic</span>
                  </th>
                  <th scope="col" className={s.num}>
                    {away.abbr ?? away.name}
                  </th>
                  <th scope="col" className={s.num}>
                    {home.abbr ?? home.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {box.compare.map((c) => (
                  <tr key={c.label}>
                    <th scope="row" className={s.player}>
                      {c.label}
                    </th>
                    <td className={s.num}>{c.values[0]}</td>
                    <td className={s.num}>{c.values[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className={s.teams}>
        {box.teams.map((t) => (
          <section key={t.teamId} className={s.teamCol} aria-label={t.name}>
            <h2 className={t.ours ? s.h2Ours : s.h2}>{t.name}</h2>
            {t.tables.length === 0 && <p className={s.note}>Player statistics aren’t available for this game.</p>}
            {t.tables.map((tb, i) => (
              <PlayerTable t={tb} key={`${tb.title}-${i}`} />
            ))}
          </section>
        ))}
      </div>

      {live && <p className={s.note}>Updates every 30 seconds while the game is on.</p>}
    </article>
  );
}
