import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useBoxScore } from '../lib/useBoxScore';
import BoxScoreView from '../components/BoxScoreView';
import PageMeta from '../components/PageMeta';
import s from './BoxScorePage.module.css';

/*
 * /box?lg=mlb&id=<ESPN event id> — one game's box score.
 *
 * Which game is only known in the browser (the query string), so the prerender
 * is a neutral shell: it and the first client render both show the same
 * "Loading" line, and the query is read after mount. That keeps hydration
 * clean and avoids needing a route per game (there are thousands, and most are
 * history nobody searches for). The page is noindex and kept out of the sitemap.
 */
export default function BoxScorePage() {
  const { search } = useLocation();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const params = new URLSearchParams(search);
  const lg = mounted ? params.get('lg') : null;
  const id = mounted ? params.get('id') : null;
  const { box, loading } = useBoxScore(lg, id);

  let body: JSX.Element;
  if (!mounted) {
    body = <p className={s.note}>Loading box score…</p>;
  } else if (!lg || !id) {
    body = <p className={s.note}>No game selected. Pick one from the scoreboard.</p>;
  } else if (loading || !box) {
    body = <p className={s.note}>Loading box score…</p>;
  } else if (box.status !== 'ok') {
    body = <p className={s.note}>This box score is unavailable right now. Check back shortly.</p>;
  } else {
    body = <BoxScoreView box={box} />;
  }

  return (
    <div className={s.page}>
      <PageMeta
        title="Box score"
        description="Box score for a Seattle game: line score, player statistics and team comparison."
        noindex
      />
      <p className={s.back}>
        <Link to="/scores">← Scoreboard</Link>
      </p>
      {body}
    </div>
  );
}
