// =============================================================================
// THE 206 FIX  —  TICKER (manual items)
// =============================================================================
// This is the ONLY ticker file you edit. Put your scores and one-liners here.
// Your latest POSTS are added automatically by the ticker (you don't list them
// here) — see the headline auto-pull in src/components/Ticker.astro.
//
// Each item has:
//   kind : 'score'  -> a result from a game on the channel  (label: SCORE)
//          'note'   -> a quip, status line, or fun aside     (label: a little >)
//   text : what scrolls across. Keep it short and punchy.
//   href : OPTIONAL. A link the item points to. Leave it out for no link.
//          - internal page:  '/retro/tecmo-week-04'  or  '/columns'
//          - YouTube etc.:   'https://www.youtube.com/@the206fix'
//
// Tips:
//   - \u00B7 prints a middot ( · ). Handy for score lines.
//   - Items show in the order listed, looping forever.
//   - Delete the examples and add your own. This file is yours to have fun with.
// =============================================================================

export interface ManualTickerItem {
  kind: 'score' | 'note';
  text: string;
  href?: string;
}

export const MANUAL_TICKER_ITEMS: ManualTickerItem[] = [
  // ---- SCORES (from your gameplay) -----------------------------------------
  { kind: 'score', text: 'TECMO S1 W1 \u00B7 SEA 24  SF 17 \u00B7 FINAL', href: '/retro' },
  { kind: 'score', text: 'TECMO S1 W2 \u00B7 SEA 31  NO 28 \u00B7 FINAL/OT', href: '/retro' },
  { kind: 'score', text: 'TECMO S1 W3 \u00B7 SEA 14  LAR 20 \u00B7 FINAL', href: '/retro' },

  // ---- NOTES (your voice — jokes, status, asides) --------------------------
  { kind: 'note', text: 'Still no commentary. Still no apologies.' },
  { kind: 'note', text: 'Sonics Watch: the clock is running.', href: '/teams/sonics' },
];
