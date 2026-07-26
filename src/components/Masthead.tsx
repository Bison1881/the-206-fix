import { Link, useLocation } from 'react-router-dom';
import styles from './Masthead.module.css';

/*
 * The nameplate crown. "The 206 Fix" links home from every interior page.
 *
 * On the front page the nameplate IS the h1 — the front page has no other
 * page-level title, and every interior route carries its own h1 ("Scoreboard",
 * "Kraken", ...), so promoting it everywhere would give each page two. Before
 * this the site had no h1 at all, on any route.
 */
export default function Masthead() {
  const isHome = useLocation().pathname === '/';

  const nameplate = (
    <Link to="/" className={styles.nameplate}>The 206 Fix</Link>
  );

  return (
    <header className={styles.masthead}>
      {isHome ? <h1 className={styles.plate}>{nameplate}</h1> : nameplate}
      <div className={styles.subhead}>Seattle Sports</div>
    </header>
  );
}
