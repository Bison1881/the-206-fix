import { anchorWire } from '../lib/feeds';
import { shortDate } from '../lib/time';
import Wire from '../components/Wire';
import AroundTheTeams from '../components/AroundTheTeams';
import FilmRoom from '../components/FilmRoom';
import PageMeta from '../components/PageMeta';
import s from './HomePage.module.css';

/*
 * The front page. Phase 2 fills the body from the build-time feed data: a lead
 * story + the wire (anchor items), Around the Teams and the Film Room — all
 * reading the one src/data/feeds.json, no runtime fetch.
 *
 * DORMANT 2026-08: the whole "coming later" placeholder strip is gone. It held
 * three cards — "On This Day" and "Inside This Edition" (Phase 3, both
 * advertising sections that are now unlinked and noindexed), and "Card of the
 * Day" (Phase 4). Nothing is being built while the site is paused, so the strip
 * only promised readers work that is not coming, and its "Phase 3"/"Phase 4"
 * badges leaked internal build numbering onto the front page. The page now ends
 * at the Film Room. The .stubs/.stub/.badge rules in HomePage.module.css are
 * intentionally left in place for the restore. Recover the strip from git
 * history (commit ab3d519^).
 */

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
    </div>
  );
}
