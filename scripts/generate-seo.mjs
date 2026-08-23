/*
 * Postbuild: write dist/robots.txt and dist/sitemap.xml.
 *
 * The URL list is derived from the HTML vite-react-ssg actually emitted rather
 * than from a hand-kept array, so adding a route (or a team, which adds one
 * automatically) can never leave the sitemap silently stale. 404.html is the
 * one exclusion — it is an error document, not a page, and it ships noindex.
 *
 * Run: `npm run seo:generate` (also the `postbuild` step, so every deploy
 * regenerates both files).
 */

import { readdir, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '../dist');
const ORIGIN = 'https://the206fix.com';

// Error document, not a page.
//
// DORMANT 2026-08: the three Phase 3 scaffolds and the /teams section front are
// excluded too. All four are unlinked from the nav and render `noindex` (see
// src/routes.tsx and src/pages/TeamsIndex.tsx) — listing a noindexed URL in the
// sitemap is a contradictory signal, so both must be kept in sync. Clearing
// this list is half of restoring them.
//
// The seven individual team pages are deliberately NOT here: they stay indexed
// and stay linked from Around the Teams on the front page.
const EXCLUDE = new Set([
  '404.html',
  'this-day.html',
  'almanac.html',
  'highlights.html',
  'teams.html',
]);

/** dist/index.html -> "/", dist/mariners.html -> "/mariners" (cleanUrls). */
function pathForFile(file) {
  return file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`;
}

async function main() {
  try {
    await stat(DIST);
  } catch {
    console.error('[seo] no dist/ — run the build first.');
    process.exit(1);
  }

  const files = (await readdir(DIST))
    .filter((f) => f.endsWith('.html') && !EXCLUDE.has(f))
    .sort();

  if (files.length === 0) {
    console.error('[seo] dist/ has no HTML pages — refusing to write an empty sitemap.');
    process.exit(1);
  }

  // One timestamp for the whole build: every page is regenerated together.
  const lastmod = new Date().toISOString().slice(0, 10);

  // Front page first, then alphabetical — purely for readability.
  const paths = files.map(pathForFile).sort((a, b) => {
    if (a === '/') return -1;
    if (b === '/') return 1;
    return a.localeCompare(b);
  });

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((p) =>
      [
        '  <url>',
        `    <loc>${ORIGIN}${p === '/' ? '' : p}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        '  </url>',
      ].join('\n'),
    ),
    '</urlset>',
    '',
  ].join('\n');

  const robots = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');

  await writeFile(resolve(DIST, 'sitemap.xml'), sitemap, 'utf8');
  await writeFile(resolve(DIST, 'robots.txt'), robots, 'utf8');

  console.log(`[seo] sitemap.xml — ${paths.length} URLs; robots.txt written.`);
}

main().catch((err) => {
  console.error('[seo] failed:', err);
  process.exit(1);
});
