import s from './scaffold.module.css';

/*
 * Front page — Phase 0 scaffold. The shell (masthead, folio, ribbon slot,
 * colophon) is real and shared; the content regions below are a labelled map
 * of what each later phase fills in. No feeds, scores, or evergreen data yet.
 */
const REGIONS: { title: string; phase: string; blurb: string }[] = [
  { title: 'Lead Story + Wire', phase: 'Phase 2', blurb: 'Banner headline and the curated Seattle-only article wall.' },
  { title: 'Around the Teams', phase: 'Phase 2', blurb: 'One headline per team, logo in the left rail.' },
  { title: 'On This Day', phase: 'Phase 3', blurb: 'Rotating box of Seattle sports history, keyed to the date.' },
  { title: 'Card of the Day', phase: 'Phase 4', blurb: 'The pixel trading card — the site’s signature element.' },
  { title: 'The Film Room', phase: 'Phase 2', blurb: 'Auto-pulled videos + Shorts from the 206 Fix channel.' },
  { title: 'Inside This Edition', phase: 'Phase 3', blurb: 'Teaser strip pointing into This Day, Almanac, Highlights.' },
];

export default function HomePage() {
  return (
    <div className={s.page}>
      <div className={s.banner}>Foundation Laid</div>
      <div className={s.deck}>
        Phase 0 is up: the masthead, folio, score-ribbon slot, and colophon are
        live and shared across every page. Content blocks arrive by phase.
      </div>
      <hr className={s.rule} />
      <div className={s.grid}>
        {REGIONS.map((r) => (
          <div className={s.slot} key={r.title}>
            <span className={s.badge}>{r.phase}</span>
            <h3>{r.title}</h3>
            <p>{r.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
