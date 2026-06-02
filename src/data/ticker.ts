// src/data/ticker.ts
// The scrolling ticker contents. Edit this file to update the ticker.
// Each item has a `kind` that controls its little colored label:
//   'score'    -> a result from a game played on the YouTube channel
//   'headline' -> a pointer to a post/column (or any news blurb)
//   'note'     -> a one-off quip, status, or fun aside
//
// `text` is what scrolls. Keep score lines short and scoreboard-like.
// Items display in array order, looping continuously.

export interface TickerItem {
  kind: 'score' | 'headline' | 'note';
  text: string;
}

export const TICKER_ITEMS: TickerItem[] = [
  { kind: 'score',    text: 'TECMO S1 W1 \u00B7 SEA 24  SF 17 \u00B7 FINAL' },
  { kind: 'headline', text: 'NEW: The Sonics Are Coming Home, and Seattle Is Already Different' },
  { kind: 'score',    text: 'TECMO S1 W2 \u00B7 SEA 31  NO 28 \u00B7 FINAL/OT' },
  { kind: 'note',     text: 'Still no commentary. Still no apologies.' },
  { kind: 'headline', text: 'FROM THE DESK: The Quiet Math of a Mariners Rebuild Worth Trusting' },
  { kind: 'score',    text: 'TECMO S1 W3 \u00B7 SEA 14  LAR 20 \u00B7 FINAL' },
  { kind: 'note',     text: 'Sonics Watch: 880-ish days and counting.' },
  { kind: 'headline', text: 'THE ARCADE: Tecmo Super Bowl, Twenty Years Late, Still Knows Seattle' },
];
