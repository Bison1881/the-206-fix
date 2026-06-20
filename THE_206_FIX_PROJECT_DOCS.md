# The 206 Fix — Project Documentation

This document keeps any new chat consistent with decisions already made. Read it
before proposing changes. If something here conflicts with a request, flag it.

---

## What this is

A Seattle sports + retro gaming website, companion to the YouTube channel
**@The206Fix** (faceless, no-commentary retro sports gameplay; launched with a Tecmo Super
Bowl Seahawks-season hack). The site is the "paper," the channel is the
"broadcast." They point at each other on purpose. Strategic goal: build an
audience of retro game enthusiasts and Seattle sports fans while looking ahead of the Sonics' expected return (target 2028-29), a potential Seattle Mariners World Series, another Seattle Seahawks Super Bowl and a hopeful Stanley Cup win for the Kraken, with the site as a "cool buffer" that funnels people to the channel.

- Live: https://the206fix.com  (also the-206-fix.vercel.app)
- Repo: github.com/Bison1881/the-206-fix
- Local: C:\Users\Tim_W\the-206-fix  (Windows, PowerShell, Notepad++, Claude Code)

## Who I am / how to work with me

- I'm Tim. Hobbyist dev; security professional by trade. Based in Queensland,
  Australia (the site is Seattle-focused; I am from Seattle and I cover it from afar).
- I make the creative, editorial, and aesthetic calls. You handle
  implementation, surface options, and give honest tradeoffs.
- Be direct. Push back when I'm wrong. Don't flatter or rubber-stamp. I've gotten
  better results when you've voiced a concern (e.g. font readability) than when
  you've just agreed.
- I write ALL content myself — it's "me on display." Never offer to write my
  columns or posts for me. Templates and plumbing: yes. My voice: mine.
- When changing the site, give me the changed files (in project structure) and
  the exact git commands. I deploy by dragging files in and pushing.

## Tech stack

Astro + Tailwind CSS + TypeScript. Markdown content collections. Deployed on
Vercel (free tier, auto-deploys on push to `main`). Seattle sports news is
RSS-aggregated via a GitHub Actions cron every 2 hours.

## LOCKED design system — do not drift without my say-so

**Palette** (in src/styles/global.css and tailwind.config.mjs):
- ink #1a1a1a · forest #2D4A3E · slate #4A5560 · fog #8FA9B8
- cream #E7E6E7 (cool newsprint grey) · paper #DCDADC · rust #A0522D

**Fonts — exactly three, all pixel/dot family:**
- Press Start 2P → all chrome: masthead title, nav, top strip, kickers,
  bylines, small labels, buttons, edition line, tagline.
- Bitcount Grid Single → all headlines (lead ~40px, scaling down), section
  heads, retro/arcade titles, prose h2/h3, drop caps, the ticker.
- Bitcount Prop Single → all body text.
- REMOVED, do not reintroduce: Playfair, Source Serif, Libre Caslon, Inter,
  Pixelify Sans, Jersey 10, Jacquard.

**Aesthetic:** old newspaper/broadsheet meets pixel-retro. Rust misregister
drop-shadow on the masthead title. Paper-texture background.

## Editorial conventions

- Byline is **Two Oh Six** (anonymous for now; may become real name later).
  Stored once in src/config.ts (DEFAULT_AUTHOR + slug + bio). NOT in frontmatter.
- Do NOT use "Mike Thunder" — that's a separate persona of mine (security
  memoirs/Substack), and "Thunder" salutes the team that took the Sonics. Wrong
  for this site.
- Teams covered: Seahawks, Mariners, Kraken, Sonics. NO Sounders (not a soccer
  fan). Team values: seahawks | mariners | kraken | sonics | general.
- No newsletter (decided against; the site's own RSS serves "follow me," and a
  newsletter would compete with the two priority destinations: site + channel).
- Voice: long view over hot take, the game over the noise, Pacific NW stubbornness.

## Architecture / how content flows

- Content lives as Markdown in src/content/articles and src/content/retro.
  Each collection has a schema in src/content/config.ts.
- Publishing ONE post propagates everywhere automatically: home page, archives,
  team page, the site's RSS feed, the author page, and the ticker headlines.
- **Templates:** src/content/{articles,retro}/_TEMPLATE.md — copy, rename, fill,
  set draft:false, push. Files starting with `_` never publish.
- **Ticker** (below nav, Bitcount Grid): two streams. Auto-pulls latest posts as
  linked headlines; manual scores/quips live in src/data/ticker.ts (each item
  `score` or `note`, optional href). The manual file is where my humor goes.
- **Author page** at /author/two-oh-six: auto-generated from bylines, lists all
  posts, has an editable bio in config.ts.
- **Date/edition/volume**: computed at build time, pinned to Seattle time
  (America/Los_Angeles). Morning Edition before noon, Evening after. Volume =
  Roman numeral years since 2026 launch. No. = day-of-year.
- **RSS aggregator**: src/scripts/fetch-rss.mjs, SOURCES array. 11 working feeds.
  Calls process.exit(0) (a past hang was the Node process not exiting); hard
  per-source timeouts. No working Sonics feed exists — Sonics is original writing.
- **Coin-op gag**: footer "Press Start to continue" plays INSERT COIN → coin drop
  → PRESS START → redirects to YouTube.

## Two reference docs in the repo

- **README.md** — architecture and reference (this doc's on-disk cousin).
- **WORKFLOW.md** — the post-a-video routine, step by step.

## Workflow / git conventions

- Edit locally in Notepad++. Deploy by dragging changed files into the project
  and pushing.
- `git commit -am "msg"` (NOT `git commit -a` — opens a broken editor here).
- `git pull --rebase` before push (the RSS bot commits between my pushes).
- Root-level files (README, WORKFLOW, tailwind.config.mjs) are easy to miss when
  dragging zips — they live in the project root, not src. Always confirm with
  `git status` before committing.
- `draft: true` hides a post; only one article should have `lead: true`.

## Open threads / what's next

- **Logo (not built yet):** retro arcade TOKEN concept. Round. Space Needle +
  skyline + Mount Rainier center, big "206" focal point, curved text "206 FIX"
  (top) and "GOOD FOR 1 FIX" (bottom). Recolored to the site palette (likely a
  brass/rust token feel), pixel style. Doubles as avatar, favicon, and the coin
  in the footer gag. A Firefly mockup exists as a LAYOUT reference only (ignore
  its neon colors and "Seattle Retro Arcade" text).
- **Channel rebrand:** current channel art is navy + bright Seahawks-green and
  does NOT match the site. I'm not attached to those colors — rebrand to match
  the site. Keep the two FanCard pixel player cards (Largent, Griffey); they're
  good and on-aesthetic.
- **Pixel art:** I'm learning in LibreSprite to make my own assets (logo, channel
  art, headline images, sports-card portraits, 8-bit GIFs). I have a staged
  learning path. I learn best hands-on/tactile. Don't make my art for me; help me
  learn to make it, and help with planning/feedback/references.
- Possible later: Open Graph social images, pulling live YouTube videos onto the
  home page.
