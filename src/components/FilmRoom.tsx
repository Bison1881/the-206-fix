import { videos } from '../lib/feeds';
import s from './feed.module.css';

/*
 * The Film Room — latest uploads from the 206 Fix YouTube channel (spec §5).
 * The channel feed is "latest uploads"; we don't try to split Shorts from
 * long-form. Cards link out to YouTube. Hidden entirely when there are none.
 */
export default function FilmRoom() {
  if (!videos.length) return null;

  return (
    <section className={s.section}>
      <h2 className={s.sectionHead}>The Film Room</h2>
      <div className={s.videos}>
        {videos.slice(0, 6).map((v) => (
          <a
            className={s.videoCard}
            key={v.videoId || v.link}
            href={v.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className={s.thumbWrap}>
              {v.thumbnail && <img className={s.thumb} src={v.thumbnail} alt="" loading="lazy" />}
            </div>
            <div className={s.videoTitle}>{v.title}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
