import { Outlet, ScrollRestoration } from 'react-router-dom';
import Folio from './Folio';
import Masthead from './Masthead';
import SectionNav from './SectionNav';
import Colophon from './Colophon';
import TypeSample from './TypeSample';

/*
 * The shared shell every page inherits: folio → masthead → section nav →
 * page content → colophon. Mobile collapse (scoreboard, then
 * lead story, then features, single column) is handled by each block's own
 * module CSS.
 */
export default function Layout() {
  return (
    <>
      <div className="wrap">
        <Folio />
        <Masthead />
        <SectionNav />
        <main>
          <Outlet />
        </main>
        <Colophon />
      </div>
      <TypeSample />
      <ScrollRestoration />
    </>
  );
}
