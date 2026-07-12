import type { RouteRecord } from 'vite-react-ssg';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import TeamsIndex from './pages/TeamsIndex';
import StubPage from './pages/StubPage';
import NotFound from './pages/NotFound';
import { TEAMS } from './lib/teams';

/*
 * Multi-page route table. Every path gets its own URL (and, under
 * vite-react-ssg, its own prerendered static HTML) so evergreen pages can rank
 * — the discovery-engine goal. Phase 0 fills each interior route with a stub;
 * later phases swap in the real page.
 */

// One static route per covered team → /mariners, /seahawks, ...
const teamRoutes: RouteRecord[] = TEAMS.map((t) => ({
  path: t.id,
  element: (
    <StubPage
      title={t.name}
      phase="Phase 3"
      blurb={`The ${t.name} interior page — auto-fed by that team's feeds, with hand-built depth for the big four.`}
    />
  ),
}));

export const routes: RouteRecord[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'standings',
        element: (
          <StubPage
            title="Standings"
            phase="Phase 1"
            blurb="Full standings per league, alongside the live scoreboard."
          />
        ),
      },
      { path: 'teams', element: <TeamsIndex /> },
      ...teamRoutes,
      {
        path: 'this-day',
        element: (
          <StubPage
            title="This Day in Seattle Sports"
            phase="Phase 3"
            blurb="A rotating archive of Seattle sports history, keyed to today's date."
          />
        ),
      },
      {
        path: 'almanac',
        element: (
          <StubPage
            title="The Almanac"
            phase="Phase 3"
            blurb="Records, legends, and the shelf of essential Seattle sports books."
          />
        ),
      },
      {
        path: 'highlights',
        element: (
          <StubPage
            title="The Ultimate Highlights Reel"
            phase="Phase 3"
            blurb="A curated embed of the greatest moments in Seattle sports."
          />
        ),
      },
      {
        path: 'privacy',
        element: (
          <StubPage
            title="Privacy Policy"
            phase="Phase 6"
            blurb="Site privacy policy and affiliate disclosure."
          />
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];
