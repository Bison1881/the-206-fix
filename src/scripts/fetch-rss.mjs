// src/scripts/fetch-rss.mjs
// Aggregates Seattle sports RSS feeds into a single JSON file consumed at build time.
// Run via `npm run rss:fetch` locally, or on schedule by the GitHub Actions workflow.

import Parser from 'rss-parser';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../data/rss-feed.json');

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Source list. Add or remove feeds here. `team` is used for filtering on the
// front-end. `priority` sorts equally-recent items: lower = higher priority.
// ---------------------------------------------------------------------------
const SOURCES = [
  // Major outlets
  { name: 'Seattle Times Sports',  url: 'https://www.seattletimes.com/sports/feed/',               team: 'general', priority: 1 },
  { name: '710 Seattle Sports',    url: 'https://seattlesports.com/feed/',                          team: 'general', priority: 3 },
  // { name: 'MyNorthwest Sports',    url: 'https://mynorthwest.com/category/sports/feed/',           team: 'general', priority: 4 },
  // ^ Disabled. Feed returns content not recognized as RSS 1 or 2 (likely JSON Feed or HTML).
  //   Revisit if MyNorthwest changes their feed format or if a working tag-level feed is identified.

  // Team-specific blogs
  // Field Gulls and Lookout Landing remain on SB Nation; /rss/current.xml is correct.
  // Davy Jones' Locker Room left SB Nation in 2023 and runs on its own platform.
  { name: 'Field Gulls',           url: 'https://www.fieldgulls.com/rss/current.xml',               team: 'seahawks', priority: 1 },
  { name: 'Lookout Landing',       url: 'https://www.lookoutlanding.com/rss/current.xml',           team: 'mariners', priority: 1 },
  { name: "Davy Jones' Locker Room", url: 'https://www.davyjoneslockerroom.com/feed/',              team: 'kraken',   priority: 1 },

  // Official team feeds
  { name: 'Seahawks.com',          url: 'https://www.seahawks.com/rss/news',                        team: 'seahawks', priority: 6 },
  { name: 'Mariners.com',          url: 'https://www.mlb.com/mariners/feeds/news/rss.xml',          team: 'mariners', priority: 6 },
];

// Sources removed and why (so we don't accidentally re-add them later):
// - The Athletic Seattle (theathletic.com/team/seattle/rss/) returns 404; feeds are subscriber-only since the NYT migration.
// - KOMO Sports (komonews.com/sports.rss) returns 403; Sinclair sites block non-browser user agents and frequently rotate paths.
//   If a KOMO feed is needed later, fetch via a browser UA or scrape the sports landing page on a separate schedule.

// ---------------------------------------------------------------------------
// Per-fetch timeout. We don't want one slow source to stall the whole build.
// ---------------------------------------------------------------------------
const FETCH_TIMEOUT_MS = 10_000;
const MAX_ITEMS_PER_FEED = 8;
const MAX_TOTAL_ITEMS = 60;

const parser = new Parser({
  timeout: FETCH_TIMEOUT_MS,
  headers: {
    // A real browser-like UA gets past more aggressive WAFs (Sinclair, Cloudflare).
    'User-Agent': 'Mozilla/5.0 (compatible; The206Fix/1.0; +https://the206fix.com)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
  },
});

/**
 * Strip XML-illegal control chars and repair common unescaped-entity bugs
 * (e.g. "&" used in copy that wasn't escaped to "&amp;"). Conservative:
 * only fixes ampersands that aren't already part of a valid entity.
 */
function sanitizeXml(input) {
  return input
    // Strip control chars except tab, LF, CR
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    // Repair raw & that isn't already &amp; / &lt; / &gt; / &quot; / &apos; / &#nnnn;
    .replace(/&(?!(?:amp|lt|gt|quot|apos|#[0-9]+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

async function fetchAndParseLenient(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; The206Fix/1.0; +https://the206fix.com)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Status code ${res.status}`);
  }
  const raw = await res.text();
  const cleaned = sanitizeXml(raw);
  return await parser.parseString(cleaned);
}

function stripHtml(input) {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(input, max = 200) {
  if (!input) return '';
  if (input.length <= max) return input;
  return input.slice(0, max).replace(/\s+\S*$/, '') + '...';
}

async function fetchSource(source) {
  let feed;
  try {
    feed = await parser.parseURL(source.url);
  } catch (firstErr) {
    // Retry with the lenient path: fetch raw, sanitize XML, then parse.
    // This recovers MyNorthwest-style feeds whose copy contains unescaped ampersands.
    try {
      feed = await fetchAndParseLenient(source.url);
    } catch (secondErr) {
      return {
        ok: false,
        source: source.name,
        error: `${firstErr.message || firstErr} (lenient retry: ${secondErr.message || secondErr})`,
        items: [],
      };
    }
  }

  try {
    const items = (feed.items || []).slice(0, MAX_ITEMS_PER_FEED).map((item) => ({
      title: stripHtml(item.title || ''),
      link: item.link || '',
      pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
      isoDate: item.isoDate || (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
      excerpt: truncate(stripHtml(item.contentSnippet || item.content || ''), 220),
      source: source.name,
      team: source.team,
      priority: source.priority,
    }));
    return { ok: true, source: source.name, count: items.length, items };
  } catch (err) {
    return { ok: false, source: source.name, error: err.message || String(err), items: [] };
  }
}

async function main() {
  const startedAt = new Date();
  console.log(`[rss] Fetching ${SOURCES.length} sources at ${startedAt.toISOString()}`);

  const results = await Promise.all(SOURCES.map(fetchSource));

  const successful = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  for (const r of successful) {
    console.log(`[rss]   ok    ${r.source.padEnd(28)} ${r.count} items`);
  }
  for (const r of failed) {
    console.warn(`[rss]   FAIL  ${r.source.padEnd(28)} ${r.error}`);
  }

  const allItems = successful
    .flatMap((r) => r.items)
    .filter((item) => item.title && item.link)
    .sort((a, b) => {
      const dateDiff = new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return a.priority - b.priority;
    })
    .slice(0, MAX_TOTAL_ITEMS);

  const output = {
    generatedAt: startedAt.toISOString(),
    sourceCount: SOURCES.length,
    successfulSources: successful.length,
    failedSources: failed.map((f) => ({ source: f.source, error: f.error })),
    items: allItems,
  };

  if (DRY_RUN) {
    console.log('[rss] DRY RUN. First 5 items:');
    console.log(JSON.stringify(allItems.slice(0, 5), null, 2));
    console.log(`[rss] Total: ${allItems.length} items from ${successful.length}/${SOURCES.length} sources.`);
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  const elapsed = ((Date.now() - startedAt.getTime()) / 1000).toFixed(2);
  console.log(`[rss] Wrote ${allItems.length} items to ${OUTPUT_PATH} in ${elapsed}s`);
}

main().catch((err) => {
  console.error('[rss] Fatal error:', err);
  process.exit(1);
});
