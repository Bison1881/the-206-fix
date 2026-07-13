/*
 * Phase 2 feed sources — the single list the build-time aggregator reads
 * (mirrors `new site plan/206-fix-rss-feeds.md`). Plain JS so the Node script
 * stays dependency-light and robust; `team` values match the ids in
 * src/lib/teams.ts.
 *
 *   team : TeamKey | 'local'   ('local' = cross-team Seattle outlet)
 *   type : 'blog' | 'official' ('official' self-heals to Google News on failure)
 *   role : 'anchor' | 'depth'  (anchor = front-page wire + Around the Teams;
 *                               depth = that team's interior page only)
 *
 * URLs marked "verify" are best-known guesses; the pipeline logs which resolve,
 * and any failing `official` source falls back to Google News, so a wrong or
 * dead URL degrades gracefully instead of leaving a gap.
 */

export const SOURCES = [
  // ── Cross-team Seattle locals (Seattle-filtered at build) ──────────────
  { team: 'local', name: 'Seattle Times Sports', url: 'https://www.seattletimes.com/sports/feed/', type: 'blog', role: 'anchor' },
  { team: 'local', name: '710 Seattle Sports', url: 'https://seattlesports.com/feed/', type: 'blog', role: 'anchor' },
  { team: 'local', name: 'KING 5 Sports', url: 'https://www.king5.com/feeds/syndication/rss/sports', type: 'blog', role: 'depth' }, // verify

  // ── Mariners ───────────────────────────────────────────────────────────
  { team: 'mariners', name: 'Lookout Landing', url: 'https://www.lookoutlanding.com/rss/current.xml', type: 'blog', role: 'anchor' },
  { team: 'mariners', name: 'Sodo Mojo', url: 'https://sodomojo.com/feed/', type: 'blog', role: 'depth' },
  { team: 'mariners', name: 'MLB Trade Rumors — Mariners', url: 'https://www.mlbtraderumors.com/seattle-mariners/feed/', type: 'blog', role: 'depth' },
  { team: 'mariners', name: 'Mariners.com', url: 'https://www.mlb.com/mariners/feeds/news/rss.xml', type: 'official', role: 'depth' },

  // ── Seahawks ───────────────────────────────────────────────────────────
  { team: 'seahawks', name: 'Field Gulls', url: 'https://www.fieldgulls.com/rss/current.xml', type: 'blog', role: 'anchor' },
  { team: 'seahawks', name: '12th Man Rising', url: 'https://12thmanrising.com/feed/', type: 'blog', role: 'depth' },
  { team: 'seahawks', name: 'Hawkblogger', url: 'https://www.hawkblogger.com/feed/', type: 'blog', role: 'depth' },
  { team: 'seahawks', name: 'Pro Football Rumors — Seahawks', url: 'https://www.profootballrumors.com/seattle-seahawks-news-rumors/feed/', type: 'blog', role: 'depth' },
  { team: 'seahawks', name: 'Seahawks.com', url: 'https://www.seahawks.com/rss/news', type: 'official', role: 'depth' },

  // ── Kraken ─────────────────────────────────────────────────────────────
  { team: 'kraken', name: 'Sound Of Hockey', url: 'https://soundofhockey.com/feed/', type: 'blog', role: 'anchor' },
  { team: 'kraken', name: "Davy Jones' Locker Room", url: 'https://www.davyjoneslockerroom.com/feed/', type: 'blog', role: 'depth' },
  { team: 'kraken', name: 'Kraken Chronicle', url: 'https://krakenchronicle.com/feed/', type: 'blog', role: 'depth' }, // verify
  { team: 'kraken', name: 'Pro Hockey Rumors — Kraken', url: 'https://www.prohockeyrumors.com/seattle-kraken/feed/', type: 'blog', role: 'depth' },
  { team: 'kraken', name: 'Kraken.com', url: '', type: 'official', role: 'depth' }, // no reliable native feed → Google News

  // ── Sonics (legacy / return-tracking — no live blogs with feeds) ────────
  { team: 'sonics', name: 'Sonics News', url: '', type: 'official', role: 'anchor' }, // Google News return-watch

  // ── Sounders ───────────────────────────────────────────────────────────
  { team: 'sounders', name: 'Sounder at Heart', url: 'https://www.sounderatheart.com/feed/', type: 'blog', role: 'anchor' },
  { team: 'sounders', name: 'Sounders Nation', url: 'https://soundersnation.com/feed/', type: 'blog', role: 'depth' }, // verify
  { team: 'sounders', name: 'SoundersFC.com', url: '', type: 'official', role: 'depth' }, // Google News

  // ── Storm (Seattle-filtered; FanSided site is WNBA-wide) ────────────────
  { team: 'storm', name: 'Storm News', url: '', type: 'official', role: 'anchor' }, // Google News "Seattle Storm WNBA"
  { team: 'storm', name: 'High Post Hoops', url: 'https://www.highposthoops.com/feed/', type: 'blog', role: 'depth' }, // WNBA-wide → filtered

  // ── Reign (Seattle-filtered) ────────────────────────────────────────────
  { team: 'reign', name: 'Reign News', url: '', type: 'official', role: 'anchor' }, // Google News "Seattle Reign NWSL"
  { team: 'reign', name: 'Sounder at Heart — Reign', url: 'https://www.sounderatheart.com/feed/', type: 'blog', role: 'depth' }, // shared vertical → filtered
];

// Per-team Google News RSS query values (from the feeds sheet). Storm/Reign
// carry a league qualifier because the names are otherwise ambiguous.
export const GOOGLE_NEWS_QUERY = {
  mariners: '%22Seattle+Mariners%22',
  seahawks: '%22Seattle+Seahawks%22',
  kraken: '%22Seattle+Kraken%22',
  sonics: '%22Seattle+Sonics%22+OR+%22Seattle+SuperSonics%22',
  sounders: '%22Seattle+Sounders%22',
  storm: '%22Seattle+Storm%22+WNBA',
  reign: '%22Seattle+Reign%22+NWSL',
};

export function googleNewsUrl(team) {
  const q = GOOGLE_NEWS_QUERY[team];
  return q ? `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en` : null;
}

// Seattle-relevance filter for cross-team locals, WNBA/NWSL-wide blogs, and
// Google News results — keeps off-topic items off the wall.
export const SEATTLE_PATTERNS = [
  /seattle/i,
  /mariners/i,
  /seahawks/i,
  /kraken/i,
  /sonics|supersonics/i,
  /sounders/i,
  /\bstorm\b/i,
  /\breign\b/i,
];

// A source needs the Seattle filter unless it's a team-specific blog (already
// on-topic). Locals, officials (Google News), and league-wide blogs get filtered.
export function needsSeattleFilter(source) {
  return source.team === 'local' || source.type === 'official' || /High Post Hoops|Reign$/.test(source.name);
}

// 206 Fix YouTube channel (resolved + feed-verified from @The206Fix).
export const YOUTUBE_CHANNEL_ID = 'UCFS_B5W-vRNXQa6G3LYwmwA';

// Community pulse — subreddit top-of-day feeds (Reddit needs a real UA).
export const SUBREDDITS = ['Mariners', 'Seahawks', 'SeattleKraken'];
