# The 206 Fix

Seattle sports and retro gaming, with a pixel heart. Companion site to [The 206 Fix on YouTube](https://www.youtube.com/@the206fix).

Built with Astro, Tailwind, TypeScript. Deployed on Vercel. RSS aggregated on a schedule via GitHub Actions.

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
  components/        Astro components (Masthead, Nav, HeroSection, etc.)
  content/
    articles/        Original writing (Markdown with frontmatter)
    retro/           YouTube companion pieces (Markdown with frontmatter)
    config.ts        Content collection schemas
  data/
    rss-feed.json    Aggregated Seattle sports RSS (generated)
  layouts/
    BaseLayout.astro Shared page chrome
  pages/
    index.astro      Front page
    articles/[...slug].astro  Article detail
  scripts/
    fetch-rss.mjs    RSS aggregator
  styles/
    global.css       Global styles, Tailwind layers, paper texture

public/
  favicon.svg        Pixel "206" favicon

.github/workflows/
  fetch-rss.yml      Hourly RSS aggregation, commits to repo
```

## Writing a new article

Create `src/content/articles/my-piece.md`:

```markdown
---
title: "Headline goes here"
deck: "Subhead. One sentence, italicized in the layout."
author: "Mike Thunder"
publishDate: 2026-05-26
tag: "Long View"          # see config.ts for the allowed tag values
team: "seahawks"          # seahawks | mariners | kraken | sounders | sonics | general
lead: false               # set true to feature on the front page
readMinutes: 8
draft: false              # true to hide from the build
---

Article body in Markdown.
```

The home page picks the lead automatically: the article flagged `lead: true`, otherwise the most recent. The three "From the Desk" columns are the next three most recent.

## Writing a retro piece

Create `src/content/retro/episode-N.md`:

```markdown
---
title: "Tecmo Super Bowl 2026: Seahawks Season, Week 2 vs. Saints"
deck: "Optional subhead."
author: "Mike Thunder"
publishDate: 2026-05-30
episodeNumber: 2
youtubeId: "abc123XYZ"
game: "Tecmo Super Bowl 2026 (community hack)"
series: "Seahawks Season"
featured: true             # one piece can be featured in The Arcade slot
readMinutes: 5
---

Body content.
```

## RSS aggregation

The aggregator pulls from sources defined in `src/scripts/fetch-rss.mjs`. Edit the `SOURCES` array to add or remove feeds.

- Run locally: `npm run rss:fetch`
- Dry run (no file write): `npm run rss:test`
- Scheduled: every 2 hours via `.github/workflows/fetch-rss.yml`

On a successful scheduled run, the workflow commits the updated `src/data/rss-feed.json` to `main`, which triggers a Vercel rebuild. If the JSON is unchanged, no commit is made.

## Design system

- **Palette**: forest `#2D4A3E`, slate `#4A5560`, fog `#8FA9B8`, cream `#F4EEE0`, paper `#EFE7D2`, rust `#A0522D`, ink `#1a1a1a`
- **Fonts**: Press Start 2P (masthead, section tags), Pixelify Sans (nav, Arcade), Playfair Display (headlines), Libre Caslon Text (deck, italics), Source Serif 4 (body), Inter (UI/meta)

## Deployment to Vercel

1. Push the repo to GitHub.
2. Import the repo at vercel.com.
3. Framework preset: Astro (auto-detected).
4. Build command: `npm run build` (default).
5. Output directory: `dist` (default).
6. Add the custom domain `the206fix.com` once purchased.

No environment variables needed for v1.
