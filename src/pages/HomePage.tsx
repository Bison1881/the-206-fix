import { anchorWire } from '../lib/feeds';
import { shortDate } from '../lib/time';
import Wire from '../components/Wire';
import AroundTheTeams from '../components/AroundTheTeams';
import FilmRoom from '../components/FilmRoom';
import PageMeta from '../components/PageMeta';
import s from './HomePage.module.css';

/*
 * The front page. Phase 2 fills the body from the build-time feed data: a lead
 * story + the wire (anchor items), Around the Teams, the Film Room, and the
 * community pulse — all reading the one src/data/feeds.json, no runtime fetch.
 * The Card of the Day region stays a labelled placeholder until Phase 4.
 */

/*
 * DORMANT 2026-08: the two Phase 3 placeholder cards were removed from this
 * strip — "On This Day", and "Inside This Edition" whose blurb named This Day,
 * Almanac and Highlights directly. Both advertised sections that are now
 * unlinked and noindexed. "Card of the Day" (Phase 4) is untouched and left
 * standing alone; restore the other two from git history (commit 3f3c213^).
 */
const LATER = [
  { title: 'Card of the Day', phase: 'Phase 4', blurb: 'The pixel trading card — the site’s signature element.' },
];

export default function HomePage() {
  // Cap the front page — the full depth lives on team pages, not one giant wall.
  const anchors = anchorWire(28);
  const [lead, ...rest] = anchors;

  return (
    <div className={s.page}>
      <PageMeta
        description="Seattle sports, all in one place — Mariners, Seahawks, Kraken, Sonics, Sounders, Storm and Reign. Live scores, the day's wire from every beat, and Seattle sports history."
        path="/"
      />
      {lead ? (
        <div className={s.lead}>
          <div className={s.leadKicker}>
            {lead.source} · {shortDate(lead.publishedAt)}
          </div>
          <a className={s.leadHead} href={lead.link} target="_blank" rel="noopener noreferrer">
            {lead.title}
          </a>
          {lead.snippet && <p className={s.leadSnippet}>{lead.snippet}</p>}
        </div>
      ) : (
        <div className={s.lead}>
          <div className={s.leadKicker}>The Wire</div>
          <div className={s.leadHead}>Seattle Sports, Aggregated</div>
          <p className={s.leadSnippet}>
            The wire refreshes at build time. Run the feeds fetch to populate it.
          </p>
        </div>
      )}

      <h2 className={s.wireHead}>The Wire</h2>
      <Wire items={rest.length ? rest : anchors} />

      <AroundTheTeams />
      <FilmRoom />

      <div className={s.stubs}>
        {LATER.map((r) => (
          <div className={s.stub} key={r.title}>
            <span className={s.badge}>{r.phase}</span>
            <h3>{r.title}</h3>
            <p>{r.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
