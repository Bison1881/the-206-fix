import s from './scaffold.module.css';

interface StubPageProps {
  title: string;
  phase: string;
  blurb: string;
}

/*
 * Generic interior-page placeholder. Every later-phase route renders this so
 * the URL, shell, and navigation all exist and are crawlable before the
 * feature itself is built.
 */
export default function StubPage({ title, phase, blurb }: StubPageProps) {
  return (
    <div className={s.page}>
      <span className={s.badge}>{phase}</span>
      <div className={s.banner}>{title}</div>
      <div className={s.deck}>{blurb}</div>
      <hr className={s.rule} />
      <p className={s.note}>This page is scaffolded. Its content is built in {phase}.</p>
    </div>
  );
}
