import { Link } from 'react-router-dom';
import type { Team, TeamKey } from '../../lib/teams';
import type { TeamScore } from '../../lib/espn';
import { boardView, type BoardRow, type BoardView } from './view';
import SevenSegment from './SevenSegment';
import s from './ScoreBoard.module.css';

/*
 * One scoreboard per club, each in the look of its own home: a painted ballpark
 * wall, a stadium LED, an arena board hung from the rafters, a supporters'
 * ribbon, a split-flap sign, a theatre marquee. All original CSS and SVG. The
 * colours live inside each board's own frame (see the custom properties in
 * ScoreBoard.module.css) and are deliberately NOT the site's newsprint tokens:
 * a board is an object standing on the page, the way a photo would be.
 *
 * Every board is driven by the same BoardView, so they differ in looks only.
 */

type Props = { team: Team; score?: TeamScore };

const NO_BREAK = ' ';

/** Split-flap tiles (Reign): one character per tile, hinge across the middle. */
function Flip({ text, n, align = 'left' }: { text: string; n: number; align?: 'left' | 'right' }) {
  // Too long for the tiles: prefer the first word ("NORTH") over a ragged cut.
  const first = text.split(' ')[0];
  const t = text.length <= n ? text : first.length >= 4 && first.length <= n ? first : text.slice(0, n);
  const cells = (align === 'right' ? t.padStart(n, ' ') : t.padEnd(n, ' ')).split('');
  return (
    <span className={s.flips} aria-hidden="true">
      {cells.map((c, i) => (
        <span className={s.flip} key={i}>
          {c === ' ' ? NO_BREAK : c}
        </span>
      ))}
    </span>
  );
}

function Lamp({ on }: { on: boolean }) {
  return <span className={on ? s.lampOn : s.lamp} aria-hidden="true" />;
}

function BoxLink({ view }: { view: BoardView }) {
  if (!view.boxTo) return null;
  return (
    <Link className={s.boxLink} to={view.boxTo}>
      BOX SCORE →
    </Link>
  );
}

/* ── Mariners: painted ballpark wall board ───────────────────────────── */
const BLANK_INNINGS = Array.from({ length: 10 }, (_, i) => String(i + 1));
const NO_RUNS = Array.from({ length: 10 }, () => '');

/** Ballpark count lamps: balls green, strikes amber, outs red. Dark = not lit. */
function Count({ label, lit, of, tone }: { label: string; lit: number | null; of: number; tone: string }) {
  return (
    <span className={s.mCount}>
      <span className={s.mCountLabel}>{label}</span>
      {Array.from({ length: of }, (_, i) => (
        <span className={lit != null && i < lit ? `${s.mBulb} ${tone}` : s.mBulb} key={i} />
      ))}
    </span>
  );
}

function Mariners({ v }: { v: BoardView }) {
  const inn = v.live?.innings;
  const labels = inn?.labels ?? BLANK_INNINGS;
  const live = v.mode === 'live' ? v.live : undefined;
  const halfWord = live?.half === 'top' ? 'TOP' : live?.half === 'bot' ? 'BOT' : live?.half ? live.half.toUpperCase() : '';
  return (
    <>
      <div className={s.mPlate}>
        <span>T-MOBILE PARK</span>
        <span>SEATTLE</span>
      </div>
      <div className={s.mGrid}>
        <span />
        {labels.map((l) => (
          <span className={s.mInn} key={l}>
            {l}
          </span>
        ))}
        <span className={s.mInn}>R</span>
        {v.rows.map((r: BoardRow, i) => [
          <span className={r.ours ? s.mTeamOurs : s.mTeam} key={`n${i}`}>
            {r.name}
          </span>,
          ...(inn?.lines[i] ?? NO_RUNS).map((runs, k) => (
            <span
              className={inn?.cur && inn.cur.row === i && inn.cur.col === k ? s.mCellCur : s.mCell}
              key={`c${i}-${k}`}
            >
              {runs}
            </span>
          )),
          <span className={s.mRun} key={`r${i}`}>
            {r.score}
          </span>,
        ])}
      </div>
      {live && (
        <div className={s.mCounts}>
          {live.bso && (
            <>
              <Count label="B" lit={live.bso.b} of={3} tone={s.toneB} />
              <Count label="S" lit={live.bso.s} of={2} tone={s.toneS} />
              <Count label="O" lit={live.bso.o} of={2} tone={s.toneO} />
            </>
          )}
          <span className={s.mHalf}>
            {halfWord} {live.periodLabel}
          </span>
        </div>
      )}
      <div className={s.mFoot}>
        <span className={s.mStatus}>
          <Lamp on={v.mode === 'live'} />
          {v.status}
        </span>
        {!live && <span className={s.mNote}>{v.note}</span>}
        <BoxLink view={v} />
      </div>
    </>
  );
}

/* ── Seahawks: stadium LED, GUEST over HOME ──────────────────────────── */
function FootballIcon() {
  return (
    <svg className={s.sBall} viewBox="0 0 24 14" role="img" aria-label="Has the ball">
      <ellipse cx="12" cy="7" rx="11" ry="6" fill="#8a4b1f" stroke="#e8c9a0" strokeWidth="1" />
      <path d="M7 7h10M10 4.6v4.8M12 4.4v5.2M14 4.6v4.8" stroke="#f4ead8" strokeWidth="1" fill="none" />
    </svg>
  );
}

/** Three timeout dots under a team: lit = remaining, dark = used or unknown. */
function Timeouts({ left }: { left: number | null }) {
  return (
    <span className={s.sTimeouts} role="img" aria-label={left == null ? 'Timeouts unknown' : `${left} timeouts left`}>
      {[0, 1, 2].map((i) => (
        <span className={left != null && i < left ? s.sTimeoutOn : s.sTimeout} key={i} />
      ))}
    </span>
  );
}

function Seahawks({ v }: { v: BoardView }) {
  const labels = ['GUEST', 'HOME'];
  const live = v.mode === 'live' ? v.live : undefined;
  return (
    <>
      <div className={s.sHead}>
        <span>LUMEN FIELD</span>
        <span className={s.sCrest}>12</span>
      </div>
      <div className={s.sBody}>
        <div className={s.sTeams}>
          {v.rows.map((r: BoardRow, i) => (
            <div className={r.ours ? s.sRowOurs : s.sRow} key={i}>
              <span className={s.sLabel}>{labels[i]}</span>
              <span className={s.sTeamCell}>
                <span className={s.sNameLine}>
                  <span className={s.sBallSlot}>{live?.ballRow === i ? <FootballIcon /> : null}</span>
                  <span className={s.sName}>{r.name}</span>
                </span>
                {live?.timeouts && <Timeouts left={live.timeouts[i]} />}
              </span>
              <span className={s.sScore}>
                <SevenSegment value={r.score} digits={2} />
              </span>
            </div>
          ))}
        </div>
        <div className={s.sInfo}>
          <span className={s.sStatus}>
            <Lamp on={v.mode === 'live'} />
            {v.status}
          </span>
          {live ? (
            <>
              <span className={s.sQtr}>{live.periodLabel || '—'}</span>
              <span className={s.sClock}>{live.clock || '—'}</span>
              <span className={s.sDown}>{live.downText ?? ''}</span>
              {live.spot && <span className={s.sSpot}>BALL ON {live.spot}</span>}
            </>
          ) : (
            <span className={s.sNote}>{v.note}</span>
          )}
        </div>
      </div>
      <BoxLink view={v} />
    </>
  );
}

/* ── Kraken: arena board hung from the rafters ───────────────────────── */
/** "8:41" -> "08:41" so the board always shows the same four digits. */
const padClock = (c: string) => (/^\d:/.test(c) ? `0${c}` : c);

function Kraken({ v }: { v: BoardView }) {
  return (
    <>
      <span className={s.kCableL} aria-hidden="true" />
      <span className={s.kCableR} aria-hidden="true" />
      <div className={s.kHead}>
        <Lamp on={v.mode === 'live'} />
        <span>CLIMATE PLEDGE ARENA</span>
        <Lamp on={v.mode === 'live'} />
      </div>
      <div className={s.kRows}>
        {v.rows.map((r: BoardRow, i) => (
          <div className={r.ours ? s.kRowOurs : s.kRow} key={i}>
            <span className={s.kName}>{r.name}</span>
            <span className={s.kScore}>
              <SevenSegment value={r.score} digits={2} />
            </span>
          </div>
        ))}
      </div>
      {v.mode === 'live' && v.live && (
        <div className={s.kClockBar}>
          <span className={s.kPeriod}>
            <span className={s.kPeriodLabel}>PERIOD</span>
            <span className={s.kPeriodValue}>{v.live.periodLabel || '—'}</span>
          </span>
          <span className={s.kClock}>
            <span className={s.kPeriodLabel}>TIME</span>
            <SevenSegment value={padClock(v.live.clock)} digits={Math.max(padClock(v.live.clock).length, 4)} />
          </span>
        </div>
      )}
      <div className={s.kFoot}>
        <span className={s.kStatus}>{v.status}</span>
        {v.mode !== 'live' && <span>{v.note}</span>}
        <BoxLink view={v} />
      </div>
    </>
  );
}

/* ── Sounders: supporters' LED ribbon board ──────────────────────────── */
function Sounders({ v }: { v: BoardView }) {
  const [a, b] = v.rows;
  return (
    <>
      <div className={s.rbTop}>
        <span className={a.ours ? s.rbNameOurs : s.rbName}>{a.name}</span>
        <span className={b.ours ? s.rbNameOurs : s.rbName}>{b.name}</span>
      </div>
      <div className={s.rbMain}>
        <span className={s.rbScore}>{a.score || '·'}</span>
        <span className={s.rbDash}>–</span>
        <span className={s.rbScore}>{b.score || '·'}</span>
      </div>
      <div className={s.rbFoot}>
        <span className={s.rbStatus}>
          <Lamp on={v.mode === 'live'} />
          {v.status}
        </span>
        <span>{v.note}</span>
        <span className={s.rbVenue}>LUMEN FIELD</span>
        <BoxLink view={v} />
      </div>
      <div className={s.rbScarf} aria-hidden="true" />
    </>
  );
}

/* ── Storm: arena ring board, a score on each side of the clock ──────── */
function Storm({ v }: { v: BoardView }) {
  const [a, b] = v.rows;
  const side = (r: BoardRow, label: string) => (
    <div className={r.ours ? s.stSideOurs : s.stSide}>
      <span className={s.stLabel}>{label}</span>
      <span className={s.stName}>{r.name}</span>
      <span className={s.stScore}>
        <SevenSegment value={r.score} digits={3} />
      </span>
    </div>
  );
  return (
    <>
      <div className={s.stHead}>CLIMATE PLEDGE ARENA</div>
      <div className={s.stBody}>
        {side(a, 'GUEST')}
        <div className={s.stCenter}>
          <span className={s.stStatus}>
            <Lamp on={v.mode === 'live'} />
            {v.status}
          </span>
          <span className={s.stNote}>{v.note}</span>
        </div>
        {side(b, 'HOME')}
      </div>
      <BoxLink view={v} />
    </>
  );
}

/* ── Reign: split-flap sign ──────────────────────────────────────────── */
function Reign({ v }: { v: BoardView }) {
  return (
    <>
      <div className={s.rgHead}>
        <span>MATCHDAY</span>
        <span>LUMEN FIELD</span>
      </div>
      <div className={s.rgRows}>
        {v.rows.map((r: BoardRow, i) => (
          <div className={r.ours ? s.rgRowOurs : s.rgRow} key={i}>
            <Flip text={r.name} n={9} />
            <Flip text={r.score} n={2} align="right" />
          </div>
        ))}
      </div>
      <div className={s.rgFoot}>
        <Flip text={v.status} n={Math.max(4, v.status.length)} />
        <span className={s.rgNote}>{v.note}</span>
        <BoxLink view={v} />
      </div>
    </>
  );
}

/* ── Sonics: theatre marquee. No feed, so no score, just the wait. ───── */
function Sonics({ v }: { v: BoardView }) {
  return (
    <div className={s.mqFrame}>
      <span className={s.mqBulbs} aria-hidden="true" />
      <span className={s.mqBulbs2} aria-hidden="true" />
      <div className={s.mqTitle}>SONICS</div>
      <div className={s.mqSub}>{v.note || 'RETURN WATCH'}</div>
    </div>
  );
}

const THEME: Record<TeamKey, { cls: string; Body: (p: { v: BoardView }) => JSX.Element }> = {
  mariners: { cls: s.mariners, Body: Mariners },
  seahawks: { cls: s.seahawks, Body: Seahawks },
  kraken: { cls: s.kraken, Body: Kraken },
  sounders: { cls: s.sounders, Body: Sounders },
  storm: { cls: s.storm, Body: Storm },
  reign: { cls: s.reign, Body: Reign },
  sonics: { cls: s.sonics, Body: Sonics },
};

export default function ScoreBoard({ team, score }: Props) {
  const v = boardView(team, score);
  const { cls, Body } = THEME[team.id];
  return (
    <div className={`${s.board} ${cls} ${s[v.mode]}`} role="group" aria-label={v.summary} data-team={team.id}>
      <Body v={v} />
      {v.series && <div className={s.series}>{v.series}</div>}
    </div>
  );
}
