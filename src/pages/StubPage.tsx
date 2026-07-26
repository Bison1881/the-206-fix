import PageMeta from '../components/PageMeta';
import s from './scaffold.module.css';

interface StubPageProps {
  title: string;
  phase: string;
  blurb: string;
  /** Route path, leading slash — drives canonical. */
  path: string;
}

/*
 * Generic interior-page placeholder. Every later-phase route renders this so
 * the URL, shell, and navigation all exist and are crawlable before the
 * feature itself is built.
 */
export default function StubPage({ title, phase, blurb, path }: StubPageProps) {
  return (
    <div className={s.page}>
      <PageMeta title={title} description={blurb} path={path} />
      <span className={s.badge}>{phase}</span>
      <h1 className={s.banner}>{title}</h1>
      <div className={s.deck}>{blurb}</div>
      <hr className={s.rule} />
      <p className={s.note}>This page is scaffolded. Its content is built in {phase}.</p>
    </div>
  );
}
