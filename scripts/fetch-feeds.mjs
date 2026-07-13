/*
 * Phase 2 build-time aggregator. Fetches every source in feeds.config.mjs,
 * self-heals dead official feeds via Google News, Seattle-filters, de-dups,
 * sorts, and writes src/data/feeds.json for SSG to prerender from. Also pulls
 * the 206 Fix YouTube uploads and subreddit community pulse.
 *
 * Run: `npm run feeds:fetch` (also `--dry-run`). Runs automatically as the
 * prebuild step, so every deploy regenerates the JSON fresh (spec §2, §4).
 *
 * Resilience contract: a dead/malformed feed is skipped and logged, never
 * throws, never fails the build. The fetch/parse hardening (timeouts, lenient
 * XML repair, HTML stripping) is salvaged from the old Astro fetch-rss.mjs.
 */

import Parser from 'rss-parser';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SOURCES,
  googleNewsUrl,
  SEATTLE_PATTERNS,
  needsSeattleFilter,
  YOUTUBE_CHANNEL_ID,
  SUBREDDITS,
} from './feeds.config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../src/data/feeds.json');
const DRY_RUN = process.argv.includes('--dry-run');

const FETCH_TIMEOUT_MS = 10_000;
const HARD_TIMEOUT_MS = 15_000;
const MAX_ITEMS_PER_FEED = 8;
// Generous cap: the JSON is the source for ALL surfaces (front-page wire,
// Around the Teams, per-team pages), so it must retain every team's items —
// a tight global cap sorted by date would starve quieter teams. Components
// slice per surface (spec §5).
const MAX_WIRE_ITEMS = 200;
const SNIPPET_MAX = 160; // ~a sentence, hard-truncated (copyright rule §6)

const UA = 'Mozilla/5.0 (compatible; The206Fix/1.0; +https://the206fix.com)';
const HEADERS = {
  'User-Agent': UA,
  Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
};

const parser = new Parser({ timeout: FETCH_TIMEOUT_MS, headers: HEADERS });

// ── Salvaged hardening helpers ──────────────────────────────────────────────

function withHardTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Hard timeout after ${ms}ms (${label})`)), ms)
    ),
  ]);
}

function sanitizeXml(input) {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

async function fetchAndParseLenient(url) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  return parser.parseString(sanitizeXml(await res.text()));
}

async function parseAny(url, label) {
  try {
    return await withHardTimeout(parser.parseURL(url), HARD_TIMEOUT_MS, label);
  } catch {
    return withHardTimeout(fetchAndParseLenient(url), HARD_TIMEOUT_MS, `${label} (lenient)`);
  }
}

function stripHtml(input) {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '')
    // Decode &amp; first so double-encoded numeric refs (&amp;#8211;) resolve,
    // then numeric (hex + decimal) refs, then the common named ones.
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(input, max) {
  if (!input) return '';
  if (input.length <= max) return input;
  return input.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

function isoOf(item) {
  return item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString());
}

function isSeattleRelevant(title, snippet) {
  const hay = `${title} ${snippet}`;
  return SEATTLE_PATTERNS.some((re) => re.test(hay));
}

// ── Per-source fetch → normalized WireItem[] ────────────────────────────────

async function fetchSource(source) {
  const filter = needsSeattleFilter(source);
  let feed;
  let via = source.url;

  // Try the native URL first (if any).
  if (source.url) {
    try {
      feed = await parseAny(source.url, source.name);
    } catch {
      feed = null;
    }
  }

  // Official self-heal: no/empty/failed native feed → Google News for the team.
  const empty = !feed || !(feed.items || []).length;
  if (source.type === 'official' && empty) {
    const gnews = googleNewsUrl(source.team);
    if (gnews) {
      try {
        feed = await parseAny(gnews, `${source.name} (Google News)`);
        via = gnews;
      } catch {
        feed = feed || null;
      }
    }
  }

  if (!feed) {
    return { ok: false, source: source.name, via, error: 'fetch failed', items: [] };
  }

  const viaGNews = Boolean(via && via.includes('news.google.com'));
  const items = (feed.items || [])
    .slice(0, MAX_ITEMS_PER_FEED)
    .map((item) => {
      let title = stripHtml(item.title || '');
      // Google News appends " - Publisher" to every headline — strip it.
      if (viaGNews) title = title.replace(/\s+[-–]\s+[^-–]+$/, '').trim();
      let snippet = truncate(stripHtml(item.contentSnippet || item.summary || item.content || ''), SNIPPET_MAX);
      // Drop snippets that just echo the headline (Google News always does).
      if (viaGNews || normTitle(snippet) === normTitle(title)) snippet = '';
      return {
        title,
        link: item.link || '',
        source: source.name,
        team: source.team,
        role: source.role,
        publishedAt: isoOf(item),
        snippet,
      };
    })
    .filter((it) => it.title && it.link)
    .filter((it) => (filter ? isSeattleRelevant(it.title, it.snippet) : true));

  return { ok: true, source: source.name, via, count: items.length, items };
}

// ── De-dup by normalized title AND URL ──────────────────────────────────────

const normTitle = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const normUrl = (u) => {
  try {
    const x = new URL(u);
    return (x.host + x.pathname).toLowerCase().replace(/\/$/, '');
  } catch {
    return u;
  }
};

function dedup(items) {
  const seenT = new Set();
  const seenU = new Set();
  const out = [];
  for (const it of items) {
    const t = normTitle(it.title);
    const u = normUrl(it.link);
    if (seenT.has(t) || seenU.has(u)) continue;
    seenT.add(t);
    seenU.add(u);
    out.push(it);
  }
  return out;
}

// ── YouTube uploads + subreddit community pulse ─────────────────────────────

async function fetchVideos() {
  if (!YOUTUBE_CHANNEL_ID) return { items: [], error: 'no channel id' };
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
  try {
    const feed = await parseAny(url, 'YouTube');
    const items = (feed.items || []).slice(0, 12).map((item) => {
      const vid = (item.link && item.link.match(/[?&]v=([\w-]+)/)?.[1]) || (item.id || '').split(':').pop();
      return {
        title: stripHtml(item.title || ''),
        link: item.link || (vid ? `https://www.youtube.com/watch?v=${vid}` : ''),
        videoId: vid || '',
        publishedAt: isoOf(item),
        thumbnail: vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : '',
      };
    }).filter((v) => v.link);
    return { items };
  } catch (err) {
    return { items: [], error: err.message || String(err) };
  }
}

async function fetchCommunity() {
  const out = [];
  const failed = [];
  // Sequential with a gap — Reddit rate-limits (429) bursts of parallel
  // requests, even with a descriptive UA. Best-effort: a 429 on one sub is
  // logged, never fatal.
  for (const sub of SUBREDDITS) {
    const url = `https://www.reddit.com/r/${sub}/top/.rss?t=day`;
    try {
      const feed = await parseAny(url, `r/${sub}`);
      for (const item of (feed.items || []).slice(0, 5)) {
        out.push({
          title: stripHtml(item.title || ''),
          link: item.link || '',
          subreddit: `r/${sub}`,
          publishedAt: isoOf(item),
        });
      }
    } catch (err) {
      failed.push({ source: `r/${sub}`, error: err.message || String(err) });
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  out.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return { items: out, failed };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date();
  console.log(`[feeds] Fetching ${SOURCES.length} sources at ${startedAt.toISOString()}`);

  const results = await Promise.all(SOURCES.map(fetchSource));
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  for (const r of ok) {
    const fellBack = r.via && r.via.includes('news.google.com') ? ' [→GoogleNews]' : '';
    console.log(`[feeds]   ok    ${r.source.padEnd(32)} ${r.count} items${fellBack}`);
  }
  for (const r of failed) {
    console.warn(`[feeds]   FAIL  ${r.source.padEnd(32)} ${r.error}`);
  }

  const wire = dedup(
    ok.flatMap((r) => r.items).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
  ).slice(0, MAX_WIRE_ITEMS);

  const videos = await fetchVideos();
  const community = await fetchCommunity();

  console.log(`[feeds] wire: ${wire.length} items | videos: ${videos.items.length} | community: ${community.items.length}`);

  const output = {
    generatedAt: startedAt.toISOString(),
    wire,
    videos: videos.items,
    community: community.items,
    log: {
      sourceCount: SOURCES.length,
      ok: ok.map((r) => ({ source: r.source, count: r.count, googleNews: r.via?.includes('news.google.com') || false })),
      failed: [
        ...failed.map((f) => ({ source: f.source, error: f.error })),
        ...(videos.error ? [{ source: 'YouTube', error: videos.error }] : []),
        ...community.failed,
      ],
    },
  };

  if (DRY_RUN) {
    console.log('[feeds] DRY RUN — first 5 wire items:');
    console.log(JSON.stringify(wire.slice(0, 5), null, 2));
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(2);
  console.log(`[feeds] Wrote ${wire.length} wire items to ${OUTPUT_PATH} in ${elapsed}s`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // Even a fatal error must not fail the build — write nothing, log loud.
    console.error('[feeds] Fatal error (build continues):', err);
    process.exit(0);
  });
