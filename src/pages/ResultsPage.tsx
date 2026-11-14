import { Link } from 'react-router-dom';
import { TEAMS } from '../lib/teams';
import RecentResults from '../components/RecentResults';
import PageMeta from '../components/PageMeta';
import s from './ResultsPage.module.css';

/*
 * Every club's last ten finals on one page (the club heading names each list), each with its box score. The lists
 * are client-fetched (see RecentResults), so the prerender is just the club
 * headings; a club with no results yet simply shows nothing under its name.
 */
const CLUBS = TEAMS.filter((t) => t.kind === 'live');

export default function ResultsPage() {
  return (
    <div className={s.page}>
      <PageMeta
        title="Results"
        description="Recent Seattle results: the last ten games for the Mariners, Seahawks, Kraken, Sounders, Storm and Reign, each with its box score."
        path="/results"
      />
      <h1 className={s.head}>Results</h1>
      <div className={s.grid}>
        {CLUBS.map((t) => (
          <section key={t.id} className={s.club} aria-label={`${t.name} results`}>
            <h2 className={s.clubHead}>
              <Link to={`/${t.id}`}>{t.name}</Link>
            </h2>
            <RecentResults team={t} n={10} title="" all={false} emptyNote="No games played yet" />
          </section>
        ))}
      </div>
    </div>
  );
}
