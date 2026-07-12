import { Outlet, ScrollRestoration } from 'react-router-dom';
import Folio from './Folio';
import Masthead from './Masthead';
import SectionNav from './SectionNav';
import RibbonSlot from './RibbonSlot';
import Colophon from './Colophon';

/*
 * The shared shell every page inherits: folio → masthead → section nav →
 * score ribbon → page content → colophon. Mobile collapse (scoreboard, then
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
        <RibbonSlot />
        <main>
          <Outlet />
        </main>
        <Colophon />
      </div>
      <ScrollRestoration />
    </>
  );
}
