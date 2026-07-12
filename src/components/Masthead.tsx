import { Link } from 'react-router-dom';
import styles from './Masthead.module.css';

/** The nameplate crown. "The 206 Fix" links home from every interior page. */
export default function Masthead() {
  return (
    <header className={styles.masthead}>
      <Link to="/" className={styles.nameplate}>The 206 Fix</Link>
      <div className={styles.subhead}>Seattle Sports</div>
    </header>
  );
}
