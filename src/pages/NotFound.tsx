import s from './scaffold.module.css';

export default function NotFound() {
  return (
    <div className={s.page}>
      <div className={s.banner}>Page Not Found</div>
      <div className={s.deck}>That edition never went to press.</div>
      <hr className={s.rule} />
      <p className={s.note}>Head back to the front page.</p>
    </div>
  );
}
