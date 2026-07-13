import { community } from '../lib/feeds';
import s from './feed.module.css';

/*
 * Community pulse — top-of-day subreddit posts (spec §5), a distinct texture
 * from the editorial wire. Best-effort: Reddit rate-limits build IPs, so this
 * can be thin or empty; hidden entirely when there's nothing.
 */
export default function CommunityPulse() {
  if (!community.length) return null;

  return (
    <section className={s.section}>
      <h2 className={s.sectionHead}>Community Pulse</h2>
      <div className={s.community}>
        {community.slice(0, 10).map((c) => (
          <div className={s.redditItem} key={c.link}>
            <span className={s.sub}>{c.subreddit}</span>
            <a className={s.redditLink} href={c.link} target="_blank" rel="noopener noreferrer">
              {c.title}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
