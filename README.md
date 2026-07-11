# The 206 Fix

Seattle sports and retro gaming, with a pixel heart. Companion site to [The 206 Fix on YouTube](https://www.youtube.com/@the206fix).

Built with Astro, Tailwind, TypeScript. Deployed on Vercel. Seattle sports news is RSS-aggregated on a schedule via GitHub Actions.

> Day-to-day "how do I post after recording a video" lives in **WORKFLOW.md**.
> This README is the architecture and reference. WORKFLOW.md is the routine.

**The site is a low-maintenance aggregator.** One front page, two things stacked
top to bottom:
- **On the Channel** — your YouTube videos. Newest is the big lead; older ones
  are cards below. Every video links straight to YouTube; there are no on-site
  video pages.
- **The Wire** — aggregated Seattle sports news, refreshed automatically.

There is no original written content anymore (no columns, team pages, author
page, or archives). The only thing you publish by hand is videos.

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
  components/        Astro components:
                       Masthead, TopStrip, Ticker, Footer   (page chrome)
                       VideoColumn (the videos), Wire (the news band)
                       CoinOp (the footer "Press Start" gag)
  config.ts          Site-wide constants: title, description, YouTube URL,
                       plus youtubeWatchUrl() and youtubeThumb() helpers
  content/
    videos/          Your YouTube videos (Markdown + frontmatter)
      _TEMPLATE.md   Copy this to start a new video (hidden; never publishes)
    config.ts        Content collection schema (the `videos` collection)
  data/
    rss-feed.json    Aggregated Seattle sports RSS (generated; do not hand-edit)
    ticker.ts        Manual ticker items (your scores + quips). See "Ticker" below.
  layouts/
    BaseLayout.astro Shared page chrome (top strip, masthead, ticker, footer).
                       Supports a `noindex` prop (used by the About page).
  pages/
    index.astro      Front page (videos + wire)
    about.astro      Hidden: noindex + not linked anywhere. Direct URL only.
    404.astro
    rss.xml.js       The site's own outgoing RSS feed (lists your videos)
  scripts/
    fetch-rss.mjs    RSS aggregator
  styles/
    global.css       Global styles, Tailwind layers, paper texture, font imports

public/
  favicon.svg        Pixel "206" favicon

.github/workflows/
  fetch-rss.yml      Scheduled RSS aggregation, commits to repo
```

## Publishing a new video

Copy `src/content/videos/_TEMPLATE.md`, rename it (e.g. `tecmo-week-03.md`, the
name is just an internal key), fill it in. Frontmatter shape:

```markdown
---
title: "Week 3: Seahawks vs Commanders | Road to the Playoffs"
deck: "One-line blurb shown on the card."   # optional
publishDate: 2026-07-12                      # YYYY-MM-DD — decides ordering
youtubeId: "dQw4w9WgXcQ"                     # the part of the URL after v=
episodeNumber: 3                             # optional
game: "Tecmo Super Bowl 27 - Training Camp Edition"   # optional
series: "Tecmo Super Bowl 2026-27 Season"    # optional
customImage: ""                              # optional; see below
featured: false                              # reserved flag; optional
draft: false                                 # true to hide from the build
---
```

Only `title`, `publishDate`, and `youtubeId` are required. The **newest
`publishDate` automatically becomes the front-page lead**; older videos stack
below as cards. There is no manual "lead" switch.

### The video image

By default the card uses that video's **YouTube thumbnail automatically**
(`img.youtube.com/vi/<id>/hqdefault.jpg`) — zero work. To override with a game
screenshot, set `customImage`: either a file you drop in `public/` (e.g.
`customImage: "/week3-shot.jpg"`) or any full image URL.

## Ticker

The scrolling ticker below the masthead has two streams:

- **Auto:** your latest videos appear as linked "LATEST" headlines that link
  out to YouTube. You never list these by hand — publishing a video adds it.
- **Manual:** scores and quips, which you edit in `src/data/ticker.ts`. Each
  item is `score` or `note`, with an optional `href` (point it at the video on
  YouTube). This file is heavily commented.

## RSS: two separate things

- **The Wire (incoming):** the aggregator pulls from the `SOURCES` array in
  `src/scripts/fetch-rss.mjs` into `src/data/rss-feed.json`. Edit that array to
  add or remove feeds.
  - Run locally: `npm run rss:fetch`
  - Dry run (no file write): `npm run rss:test`
  - Scheduled: every 2 hours via `.github/workflows/fetch-rss.yml`. On a
    successful run it commits the updated `rss-feed.json` to `main`, triggering
    a Vercel rebuild. Unchanged JSON makes no commit. The fetcher calls
    `process.exit(0)` on completion (a past hang was the Node process not
    exiting); per-source fetches have a hard timeout so one dead feed can't
    stall the run.
- **The site's own feed (outgoing):** `src/pages/rss.xml.js` publishes
  `/rss.xml`, a feed of your **videos** (each item links to YouTube). This is
  generated from the `videos` collection — you don't edit it.

Note: there is currently no working Sonics RSS source (the known ones are dead
or have no public feed).

## Design system

**Palette** (defined in `src/styles/global.css` and `tailwind.config.mjs`):
- ink `#1a1a1a`
- forest `#2D4A3E`
- slate `#4A5560`
- fog `#8FA9B8`
- cream `#E7E6E7`   (cool newsprint grey)
- paper `#DCDADC`
- rust `#A0522D`

**Fonts** — what the code currently loads (`global.css` import + `tailwind.config.mjs`):
- **Press Start 2P** — everything: masthead chrome, headlines, section heads,
  body text, kickers, small labels, buttons, and the ticker. (All the Tailwind
  `font-*` families — mast, display, body, ui, caslon, ticker — map to it.)
- **Jacquard 24** — the masthead nameplate only (the blackletter "The 206 Fix").

## Dates, edition, volume

The top strip and masthead compute these at BUILD time, pinned to Seattle time
(`America/Los_Angeles`) so they don't drift with the UTC build server:
- **Date** — current Seattle date.
- **Edition** — "Morning Edition" before noon Seattle, "Evening Edition" after.
- **Volume** — Roman numeral, years since 2026 launch (2026 = Volume I).
- **No.** — day-of-year, zero-padded.

Because the RSS bot rebuilds every ~2 hours, these stay fresh without manual work.

## Gotchas

- Files starting with `_` (the template) are hidden and never publish. Copy it;
  don't edit it in place.
- `draft: true` hides a video. New videos copied from the template inherit it —
  set `draft: false` to go live.
- The lead is automatic (newest `publishDate`); there's no lead flag to set.
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
