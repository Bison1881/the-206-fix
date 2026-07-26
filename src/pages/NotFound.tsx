import { Link } from 'react-router-dom';
import s from './scaffold.module.css';

/*
 * Reachable two ways: the `*` catch-all during client-side navigation, and the
 * prerendered /404 route that becomes dist/404.html — the file Vercel serves
 * for any unmatched path. Before that route existed nothing on this site
 * handled a missing URL, so a bad link got Vercel's own plain-text 404 page and
 * this component never rendered at all.
 */
export default function NotFound() {
  return (
    <div className={s.page}>
      <div className={s.banner}>Page Not Found</div>
      <div className={s.deck}>That edition never went to press.</div>
      <hr className={s.rule} />
      <p className={s.note}>
        Head back to the <Link to="/">front page</Link>.
      </p>
    </div>
  );
}
