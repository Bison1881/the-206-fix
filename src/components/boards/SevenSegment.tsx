import s from './SevenSegment.module.css';

/*
 * Seven-segment LED digits, drawn as SVG polygons so they stay sharp at any
 * size and need no font. Unlit segments stay visible as a ghost, like a real
 * board with the power on. Colour comes from the parent's --seg-on / --seg-off.
 */

const T = 3.5; // half the segment thickness
const horiz = (x1: number, x2: number, y: number) =>
  `${x1},${y} ${x1 + T},${y - T} ${x2 - T},${y - T} ${x2},${y} ${x2 - T},${y + T} ${x1 + T},${y + T}`;
const vert = (x: number, y1: number, y2: number) =>
  `${x},${y1} ${x + T},${y1 + T} ${x + T},${y2 - T} ${x},${y2} ${x - T},${y2 - T} ${x - T},${y1 + T}`;

const POLY: Record<string, string> = {
  a: horiz(8, 36, 6),
  g: horiz(8, 36, 40),
  d: horiz(8, 36, 74),
  f: vert(6, 8, 38),
  b: vert(38, 8, 38),
  e: vert(6, 42, 72),
  c: vert(38, 42, 72),
};

const LIT: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
  ' ': '',
};

export default function SevenSegment({ value, digits = 3 }: { value: string; digits?: number }) {
  // Right-aligned, like a scoreboard; keep only the last `digits` if it overflows.
  const cells = value.padStart(digits, ' ').slice(-digits).split('');
  return (
    <span className={s.digits} aria-hidden="true">
      {cells.map((ch, i) => {
        const on = LIT[ch] ?? '';
        return (
          <svg className={s.digit} viewBox="0 0 44 80" key={i}>
            {Object.keys(POLY).map((k) => (
              <polygon key={k} points={POLY[k]} className={on.includes(k) ? s.on : s.off} />
            ))}
          </svg>
        );
      })}
    </span>
  );
}
