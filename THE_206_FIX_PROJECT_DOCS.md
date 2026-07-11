# The 206 Fix — Project Documentation

This document keeps any new chat consistent with decisions already made. Read it
before proposing changes. If something here conflicts with a request, flag it.

> **2026 update — the site was simplified to a low-maintenance aggregator.**
> All original written content (columns, team pages, the author page, the
> articles/retro collections and their archives) was removed. The front page is
> now one page: your YouTube videos on top (newest = lead, older = cards) and
> the aggregated Seattle sports "Wire" as a full-width band below. The only
> content published by hand is videos. Much of the "how content flows" detail
> below was rewritten to match this.

---

## What this is

A Seattle sports + retro gaming website, companion to the YouTube channel
**@The206Fix** (faceless, no-commentary retro sports gameplay; launched with a Tecmo Super
Bowl Seahawks-season hack). The site is the "paper," the channel is the
"broadcast." They point at each other on purpose. Strategic goal: build an
audience of retro game enthusiasts and Seattle sports fans while looking ahead of the Sonics' expected return (target 2028-29), a potential Seattle Mariners World Series, another Seattle Seahawks Super Bowl and a hopeful Stanley Cup win for the Kraken, with the site as a "cool buffer" that funnels people to the channel.

- Live: https://the206fix.com  (also the-206-fix.vercel.app)
- Repo: github.com/Bison1881/the-206-fix
- Local: C:\Users\Tim_W\dev\the-206-fix  (Windows, PowerShell, Notepad++, Claude Code)

## Who I am / how to work with me

- I'm Tim. Hobbyist dev; security professional by trade. Based in Queensland,
  Australia (the site is Seattle-focused; I am from Seattle and I cover it from afar).
- I make the creative, editorial, and aesthetic calls. You handle
  implementation, surface options, and give honest tradeoffs.
- Be direct. Push back when I'm wrong. Don't flatter or rubber-stamp. I've gotten
  better results when you've voiced a concern (e.g. font readability) than when
  you've just agreed.
- I write ALL my own text — it's "me on display." That still applies to video
  blurbs (the `deck` line) and my ticker quips. Never offer to write those for
  me. Templates and plumbing: yes. My voice: mine.
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

**Fonts — what the code actually loads today** (global.css import + tailwind.config.mjs):
- **Press Start 2P** → everything: masthead chrome, headlines, section heads,
  body text, kickers, labels, buttons, the ticker. (All Tailwind `font-*`
  families map to it.)
- **Jacquard 24** → the masthead nameplate only (the blackletter "The 206 Fix").
- NOTE: earlier versions of these docs listed "Bitcount Grid Single / Bitcount
  Prop Single" and said Jacquard was removed. That no longer matches the code —
  the code loads Press Start 2P + Jacquard 24. If you want a different set, say
  so and we'll change the code and this note together.

**Aesthetic:** old newspaper/broadsheet meets pixel-retro. Rust misregister
drop-shadow on the masthead title. Paper-texture background. The simplification
kept all of this unchanged — it was a subtraction, not a redesign.

## Editorial conventions

- There is **no byline / author** anymore. The written content it belonged to
  was removed, and so was the author page and the `Two Oh Six` config. If original
  writing ever comes back, decide the byline then.
- Do NOT use "Mike Thunder" — that's a separate persona of mine (security
  memoirs/Substack), and "Thunder" salutes the team that took the Sonics. Wrong
  for this site.
- Teams the Wire covers: Seahawks, Mariners, Kraken (plus general Seattle).
  Sonics has no working feed yet. NO Sounders (not a soccer fan).
- No newsletter (decided against; the site's own RSS serves "follow me," and a
  newsletter would compete with the two priority destinations: site + channel).
- Voice: long view over hot take, the game over the noise, Pacific NW stubbornness.

## Architecture / how content flows

- Content lives as Markdown in **src/content/videos**. The collection schema is
  in src/content/config.ts (the `videos` collection). Required fields: title,
  publishDate, youtubeId. Optional: deck, episodeNumber, game, series,
  customImage, featured, draft.
- Publishing ONE video propagates automatically: the home page lead/cards, the
  ticker "LATEST" headlines, and the site's own /rss.xml feed. Every video links
  straight to YouTube — there are no on-site video pages.
- **The lead is automatic:** whichever video has the newest publishDate is the
  big front-page lead; the rest are cards below. No manual lead switch.
- **Images:** a video card defaults to the YouTube thumbnail
  (img.youtube.com/vi/<id>/hqdefault.jpg). A per-video `customImage` (a file in
  public/ or any URL) overrides it.
- **Template:** src/content/videos/_TEMPLATE.md — copy, rename, fill,
  set draft:false, push. Files starting with `_` never publish.
- **Ticker** (below the masthead): two streams. Auto-pulls your latest videos as
  linked headlines (they link to YouTube); manual scores/quips live in
  src/data/ticker.ts (each item `score` or `note`, optional href — point it at
  the video on YouTube). The manual file is where my humor goes.
- **The Wire:** aggregated Seattle sports news, a full-width band under the
  videos on the front page. Fully automatic (see RSS aggregator below).
- **Date/edition/volume**: computed at build time, pinned to Seattle time
  (America/Los_Angeles). Morning Edition before noon, Evening after. Volume =
  Roman numeral years since 2026 launch. No. = day-of-year.
- **RSS aggregator**: src/scripts/fetch-rss.mjs, SOURCES array (10 working feeds;
  MyNorthwest is disabled in the list). Writes src/data/rss-feed.json. Calls
  process.exit(0) (a past hang was the Node process not exiting); hard per-source
  timeouts. No working Sonics feed exists.
- **About page**: src/pages/about.astro. Kept in the repo but HIDDEN — marked
  `noindex` and not linked anywhere; reachable by direct URL only. To bring it
  back, re-add links in TopStrip/Footer and drop the noindex. This was designed
  to be trivially reversible.
- **Coin-op gag**: footer "Press Start to continue" plays INSERT COIN → coin drop
  → PRESS START → redirects to YouTube.

## Two reference docs in the repo

- **README.md** — architecture and reference (this doc's on-disk cousin).
- **WORKFLOW.md** — the post-a-video routine, step by step.
- (There's also **How to Edit Content on The 206 Fix.txt** — the same routine in
  plain-language form.)

## Workflow / git conventions

- Edit locally in Notepad++. Deploy by dragging changed files into the project
  and pushing.
- `git commit -am "msg"` (NOT `git commit -a` — opens a broken editor here).
- `git pull --rebase` before push (the RSS bot commits between my pushes).
- Root-level files (README, WORKFLOW, tailwind.config.mjs, the .txt guide) are
  easy to miss when dragging zips — they live in the project root, not src.
  Always confirm with `git status` before committing.
- `draft: true` hides a video. The lead is automatic (newest publishDate).

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
- **Per-video custom images:** the `customImage` field exists so a game
  screenshot can replace the YouTube thumbnail on a card — a natural home for
  pixel-art episode covers once I'm making them.
- Possible later: Open Graph social images; pulling live YouTube videos onto the
  home page via the API (currently each video is a hand-made Markdown file).
