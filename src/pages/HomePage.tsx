import { anchorWire } from '../lib/feeds';
import { shortDate } from '../lib/time';
import Wire from '../components/Wire';
import AroundTheTeams from '../components/AroundTheTeams';
import FilmRoom from '../components/FilmRoom';
import CommunityPulse from '../components/CommunityPulse';
import s from './HomePage.module.css';

/*
 * The front page. Phase 2 fills the body from the build-time feed data: a lead
 * story + the wire (anchor items), Around the Teams, the Film Room, and the
 * community pulse — all reading the one src/data/feeds.json, no runtime fetch.
 * The Phase 3/4 regions (This Day, Card of the Day, the teaser strip) stay as
 * labelled placeholders until those phases land.
 */

const LATER = [
  { title: 'On This Day', phase: 'Phase 3', blurb: 'Seattle sports history, keyed to today’s date.' },
  { title: 'Card of the Day', phase: 'Phase 4', blurb: 'The pixel trading card — the site’s signature element.' },
  { title: 'Inside This Edition', phase: 'Phase 3', blurb: 'Teaser strip into This Day, Almanac, Highlights.' },
];

export default function HomePage() {
  // Cap the front page — the full depth lives on team pages, not one giant wall.
  const anchors = anchorWire(28);
  const [lead, ...rest] = anchors;

  return (
    <div className={s.page}>
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
      <CommunityPulse />

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
