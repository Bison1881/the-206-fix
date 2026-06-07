# The 206 Fix

Seattle sports and retro gaming, with a pixel heart. Companion site to [The 206 Fix on YouTube](https://www.youtube.com/@the206fix).

Built with Astro, Tailwind, TypeScript. Deployed on Vercel. Seattle sports news is RSS-aggregated on a schedule via GitHub Actions.

> Day-to-day "how do I post after recording a video" lives in **WORKFLOW.md**.
> This README is the architecture and reference. WORKFLOW.md is the routine.

---

## Quick start

```bash
npm install
npm run rss:fetch    # populate src/data/rss-feed.json
npm run dev          # http://localhost:4321
```

## Build for production

```bash
npm run build        # fetches RSS, then builds the static site to ./dist
npm run preview      # preview the production build locally
```

## Project structure

```
src/
  components/        Astro components (Masthead, Nav, Ticker, HeroSection, etc.)
  config.ts          Site-wide constants: author name/slug/bio, title, YouTube URL
  content/
    articles/        Original writing (Markdown + frontmatter)
      _TEMPLATE.md   Copy this to start a new column (hidden; never publishes)
    retro/           YouTube companion pieces (Markdown + frontmatter)
      _TEMPLATE.md   Copy this to start a new retro post (hidden; never publishes)
    config.ts        Content collection schemas
  data/
    rss-feed.json    Aggregated Seattle sports RSS (generated; do not hand-edit)
    ticker.ts        Manual ticker items (your scores + quips). See "Ticker" below.
  layouts/
    BaseLayout.astro Shared page chrome (top strip, masthead, nav, ticker, footer)
  pages/
    index.astro              Front page
    articles/[...slug].astro Article detail
    retro/[...slug].astro    Retro post detail
    retro.astro              The Arcade archive
    columns.astro            Columns archive
    author/[slug].astro      Per-author page (auto-generated from bylines)
    about.astro, 404.astro
    teams/                   seahawks / mariners / kraken / sonics
    rss.xml.js               The site's own outgoing RSS feed
  scripts/
    fetch-rss.mjs    RSS aggregator
  styles/
    global.css       Global styles, Tailwind layers, paper texture, font imports

public/
  favicon.svg        Pixel "206" favicon

.github/workflows/
  fetch-rss.yml      Scheduled RSS aggregation, commits to repo
```

## Author / byline

The byline is a single source of truth in `src/config.ts`:

```ts
export const DEFAULT_AUTHOR = 'Two Oh Six';
export const DEFAULT_AUTHOR_SLUG = 'two-oh-six';
export const DEFAULT_AUTHOR_BIO = '...';
```

You do NOT put an author in each post's frontmatter — it's applied from config.
To change the byline sitewide (e.g. switch to a real name later), edit these
three values and update the slug to match. Every byline and the author page
update automatically.

## Writing a new article (column)

Copy `src/content/articles/_TEMPLATE.md`, rename it (e.g. `mariners-rebuild.md`),
fill it in. The template is self-documenting. Frontmatter shape:

```markdown
---
title: "Headline goes here"
deck: "Subhead. One sentence, italicized in the layout."   # optional
publishDate: 2026-05-26
tag: "Long View"          # see src/content/config.ts for allowed tag values
team: "seahawks"          # seahawks | mariners | kraken | sonics | general
lead: false               # true = front-page lead story (only ONE at a time)
featured: false
readMinutes: 8
draft: false              # true to hide from the build
---

Article body in Markdown.
```

The home page picks the lead automatically: the article flagged `lead: true`,
otherwise the most recent. "From the Desk" shows the next most recent columns.

## Writing a retro piece

Copy `src/content/retro/_TEMPLATE.md`, rename it (e.g. `tecmo-week-04.md`):

```markdown
---
title: "Tecmo Super Bowl: Seahawks Season, Week 4 vs. Rams"
deck: "Optional subhead."
publishDate: 2026-05-30
episodeNumber: 4
youtubeId: "abc123XYZ"      # the part of the URL after v=
game: "Tecmo Super Bowl"
series: "Seahawks Season 1"
featured: false             # one piece can be featured in The Arcade slot
readMinutes: 5
draft: false
---

Body content.
```

## Ticker

The scrolling ticker below the nav has two streams:

- **Auto:** your latest posts appear as linked "LATEST" headlines. You never
  list these by hand — publishing a post adds it.
- **Manual:** scores and quips, which you edit in `src/data/ticker.ts`. Each
  item is `score` or `note`, with optional `href`. This file is where your
  gameplay results and humor go. It's heavily commented.

## RSS aggregation

The aggregator pulls from the `SOURCES` array in `src/scripts/fetch-rss.mjs`.
Edit that array to add or remove feeds.

- Run locally: `npm run rss:fetch`
- Dry run (no file write): `npm run rss:test`
- Scheduled: every 2 hours via `.github/workflows/fetch-rss.yml`

On a successful scheduled run, the workflow commits the updated
`src/data/rss-feed.json` to `main`, triggering a Vercel rebuild. Unchanged JSON
makes no commit. The fetcher calls `process.exit(0)` on completion (a past hang
was traced to the Node process not exiting); per-source fetches have a hard
timeout so one dead feed can't stall the run.

Note: there is currently no working Sonics RSS source (the known ones are dead
or have no public feed). Sonics coverage is original writing for now.

## Design system

**Palette** (defined in `src/styles/global.css` and `tailwind.config.mjs`):
- ink `#1a1a1a`
- forest `#2D4A3E`
- slate `#4A5560`
- fog `#8FA9B8`
- cream `#E7E6E7`   (cool newsprint grey)
- paper `#DCDADC`
- rust `#A0522D`

**Fonts** — three only, all pixel/dot family:
- **Press Start 2P** — all chrome: masthead title, nav, top strip, kickers,
  bylines, small labels, buttons, edition line, tagline.
- **Bitcount Grid Single** — all headlines (lead ~40px, scaling down), section
  heads, retro/arcade titles, prose h2/h3, drop caps, and the ticker.
- **Bitcount Prop Single** — all body text.

(Earlier candidates — Playfair, Source Serif, Libre Caslon, Inter, Pixelify
Sans, Jersey 10 — were all removed. Only the three above load.)

## Dates, edition, volume

The top strip and masthead compute these at BUILD time, pinned to Seattle time
(`America/Los_Angeles`) so they don't drift with the UTC build server:
- **Date** — current Seattle date.
- **Edition** — "Morning Edition" before noon Seattle, "Evening Edition" after.
- **Volume** — Roman numeral, years since 2026 launch (2026 = Volume I).
- **No.** — day-of-year, zero-padded.

Because the RSS bot rebuilds every ~2 hours, these stay fresh without manual work.

## Gotchas

- Files starting with `_` (the templates) are hidden and never publish. Copy
  them; don't edit them in place.
- `draft: true` hides a post. New posts copied from a template inherit it — set
  `draft: false` to go live.
- Only one article should have `lead: true` at a time.
- Commit with `git commit -am`, not `git commit -a` (the latter opens a broken
  editor on this setup).
- `git pull --rebase` before pushing — the RSS bot commits between your pushes.
- Root-level files (this README, WORKFLOW.md, tailwind.config.mjs) are easy to
  miss when dragging zips in; they live in the project root, not in `src`.

## Deployment to Vercel

Already set up and live at [the206fix.com](https://the206fix.com). For reference:
1. Repo on GitHub, imported at vercel.com.
2. Framework preset: Astro (auto-detected). Build: `npm run build`. Output: `dist`.
3. Custom domain `the206fix.com` (bare domain canonical; `www` 308-redirects to it).
4. Auto-deploys on push to `main`. No environment variables needed.
