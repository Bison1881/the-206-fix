import type { WireItem } from '../lib/feeds';
import { shortDate } from '../lib/time';
import s from './feed.module.css';

/*
 * The Wire — a presentational newspaper-column list of aggregated headlines
 * (spec §5, §6). Headline + source + date, always linking OUT to the source;
 * a short feed-supplied snippet, never article body. Reused by the front page
 * (anchor items) and each team's interior page (its full set). Uses CSS
 * multi-column so items balance across columns like real newsprint.
 */
export default function Wire({ items }: { items: WireItem[] }) {
  if (!items.length) {
    return <p className={s.empty}>No recent items.</p>;
  }

  return (
    <div className={s.wire}>
      {items.map((it) => (
        <div className={s.item} key={it.link}>
          <a className={s.headline} href={it.link} target="_blank" rel="noopener noreferrer">
            {it.title}
          </a>
          <div className={s.meta}>
            {it.source} · {shortDate(it.publishedAt)}
          </div>
          {it.snippet && <div className={s.snippet}>{it.snippet}</div>}
        </div>
      ))}
    </div>
  );
}
