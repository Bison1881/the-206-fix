import { getEdition } from '../lib/edition';
import styles from './Folio.module.css';

/** The thin dateline strip above the masthead. */
export default function Folio() {
  const ed = getEdition();
  return (
    <div className={styles.folio}>
      <span>{ed.dateLine}</span>
      <span className={styles.spot}>
        VOL. {ed.volume} · NO. {ed.number} · {ed.edition.toUpperCase()} EDITION
      </span>
      <span>{ed.place}</span>
    </div>
  );
}
