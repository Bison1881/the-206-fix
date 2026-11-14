import { useEffect, useState } from 'react';
import s from './TypeSample.module.css';

/*
 * A preview switch for type options, so a whole-site change can be judged before it is made.
 * Visit any page with ?type=sans | old | oldhead | source | off. The choice is remembered for the tab
 * (sessionStorage) and shown as a small bar at the bottom-left; with no choice made, this renders
 * nothing and the site is untouched. The serif faces load only when a serif sample is picked.
 */
const OPTIONS = [
  { id: 'off', label: 'Current' },
  { id: 'sans', label: 'Sans, new titles' },
  { id: 'old', label: 'Serif: Old Standard' },
  { id: 'oldhead', label: 'Old Standard + serif headlines' },
  { id: 'source', label: 'Serif: Source Serif' },
] as const;
type Id = (typeof OPTIONS)[number]['id'];

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Old+Standard+TT:wght@400;700&family=Source+Serif+4:wght@400;600;700&display=swap';
const KEY = 'type-sample';

function read(): Id {
  try {
    const q = new URLSearchParams(window.location.search).get('type');
    if (q && OPTIONS.some((o) => o.id === q)) {
      sessionStorage.setItem(KEY, q);
      return q as Id;
    }
    const v = sessionStorage.getItem(KEY);
    if (v && OPTIONS.some((o) => o.id === v)) return v as Id;
  } catch {
    /* storage blocked: fall through to the query string alone */
    const q = new URLSearchParams(window.location.search).get('type');
    if (q && OPTIONS.some((o) => o.id === q)) return q as Id;
  }
  return 'off';
}

function apply(id: Id) {
  const root = document.documentElement;
  if (id === 'off') delete root.dataset.type;
  else root.dataset.type = id;
  if ((id === 'old' || id === 'oldhead' || id === 'source') && !document.getElementById('type-sample-fonts')) {
    const l = document.createElement('link');
    l.id = 'type-sample-fonts';
    l.rel = 'stylesheet';
    l.href = FONT_HREF;
    document.head.appendChild(l);
  }
}

export default function TypeSample() {
  const [id, setId] = useState<Id>('off');

  useEffect(() => {
    const v = read();
    setId(v);
    apply(v);
  }, []);

  const pick = (next: Id) => {
    try {
      if (next === 'off') sessionStorage.removeItem(KEY);
      else sessionStorage.setItem(KEY, next);
    } catch {
      /* not remembered, still applied */
    }
    setId(next);
    apply(next);
  };

  if (id === 'off') return null;
  return (
    <div className={s.bar} role="group" aria-label="Type sample">
      <span className={s.label}>Type sample</span>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={o.id === id ? s.on : s.btn}
          aria-pressed={o.id === id}
          onClick={() => pick(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
