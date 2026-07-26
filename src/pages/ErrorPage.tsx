import { Link, useRouteError } from 'react-router-dom';
import Folio from '../components/Folio';
import Masthead from '../components/Masthead';
import SectionNav from '../components/SectionNav';
import Colophon from '../components/Colophon';
import PageMeta from '../components/PageMeta';
import s from './scaffold.module.css';

/*
 * The root route's errorElement.
 *
 * Without one, React Router falls back to its BUILT-IN developer error screen —
 * "Unexpected Application Error!" over a raw stack trace — and renders it to
 * readers, unstyled, below whatever had already painted. That is what a router
 * fault looked like on the live front page.
 *
 * This deliberately re-composes the shell (folio, masthead, section nav,
 * colophon) instead of reusing Layout: Layout renders an <Outlet/>, and the
 * outlet is precisely what has just failed. The ribbon is left out on purpose —
 * no reason to fire seven ESPN requests from an error page.
 *
 * Copy here is functional, not final — Tim's to rewrite.
 */
export default function ErrorPage() {
  const error = useRouteError();

  // Surfaced for the console only. Readers get the plain message above; the
  // detail stays out of the page so a stack trace never lands in the paper.
  if (typeof console !== 'undefined') console.error('[206fix] route error', error);

  return (
    <div className="wrap">
      <PageMeta title="Stop the Press" description="Something on this page failed to load." noindex />
      <Folio />
      <Masthead />
      <SectionNav />
      <main>
        <div className={s.page}>
          <h1 className={s.banner}>Stop the Press</h1>
          <div className={s.deck}>Something on this page failed to load.</div>
          <hr className={s.rule} />
          <p className={s.note}>
            Try reloading. If it sticks, the <Link to="/">front page</Link> is still running.
          </p>
        </div>
      </main>
      <Colophon />
    </div>
  );
}
