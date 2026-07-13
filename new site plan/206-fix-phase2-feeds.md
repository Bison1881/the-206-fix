# THE 206 FIX — Phase 2 Spec: Auto-Feeds

The body of the newspaper: the curated Seattle-only article wall, the 206 Fix video feed, and the community pulse. This is the block that keeps the site fresh for free. The source list lives in `206-fix-rss-feeds.md` (read it first).

Read this whole spec, then give a build plan before writing code.

---

## 1. Goal & scope

- A build-time aggregation script that fetches every feed, normalizes, de-dups, and writes JSON into the repo.
- SSG prerenders the pages from that JSON.
- A scheduled rebuild keeps content fresh with nothing running between builds.

In scope: article wall, per-team feeds, 206 Fix YouTube feed, community pulse (subreddits). Optional: podcast wall.
Out of scope: the evergreen pages (Phase 3), anything hand-written.

---

## 2. Architecture (the key constraint)

**This is the opposite of the scoreboard.** Scores are a live client island. Feeds are **build-time static**.

Browsers block cross-domain RSS fetches, so feeds cannot be fetched client-side. They're fetched server-side by a Node script at build time, written to JSON, and the pages prerender from that JSON. This is why "no backend" still works: the fetching happens during the build, not in the user's browser.

There's already a `fetch-rss.mjs` preserved at `_archive/astro-site/` from the old build. **Adapt it as the starting point** rather than writing from scratch; salvage what's useful, rewrite what doesn't fit the new structure.

---

## 3. The aggregation script

Config-driven, mirroring `206-fix-rss-feeds.md`. One entry per source:

```ts
interface FeedSource {
  team: TeamKey | 'local';   // 'local' = cross-team Seattle sources
  name: string;              // "Lookout Landing"
  url: string;               // the RSS feed URL
  type: 'blog' | 'official';
  role: 'anchor' | 'depth';  // anchor = front-page wire; depth = team pages only
}
```

Pipeline, per build:

1. **Fetch** every source (use rss-parser or similar). Set a descriptive User-Agent (some hosts, Reddit especially, reject blank UAs).
2. **Official fallback:** for any `type: 'official'` source that errors or returns zero items, swap to that team's Google News RSS query (format and per-team strings are in the feeds sheet). This self-heals: a dead .com feed never leaves a gap.
3. **Normalize** each item to one shape:
   ```ts
   interface WireItem {
     title: string;
     link: string;        // out to the source
     source: string;      // "Lookout Landing"
     team: TeamKey | 'local';
     publishedAt: string; // ISO
     snippet?: string;    // SHORT — see §6 copyright rule
   }
   ```
4. **Seattle filter:** team-specific feeds are already on-topic, but cross-team locals and Google News results must be filtered to Seattle teams/keywords so nothing off-topic leaks onto the wall.
5. **De-dup** by normalized title and by URL. SB Nation, FanSided, and Google News will carry the same story; collapse duplicates.
6. **Sort** by `publishedAt`, newest first.
7. **Write JSON** into the repo (e.g. `src/data/wire.json`), tagged by team and role so the components can filter. Include a `generatedAt` timestamp.

**Resilience:** a dead or malformed feed is skipped and logged, never breaks the build. One bad source cannot take down aggregation.

---

## 4. Scheduled rebuild (fresh content, nothing between builds)

Run the fetch script as a **prebuild step**, so every deploy regenerates the JSON fresh and nothing needs committing between builds.

To refresh on a schedule, trigger a rebuild via a **Vercel Deploy Hook pinged by a cron** (a GitHub Action on a cron, or a scheduler pinging the hook URL). Start with a few times a day; freshness equals rebuild interval, and news doesn't need minute-level.

Do NOT revive the old pattern where a bot commits the updated JSON to main on a cron. That churns main with bot commits (it's why that cron was disabled). The Deploy Hook approach keeps main clean: the JSON is a build artifact, regenerated each build, not a committed file that changes constantly. (If you prefer the committed-JSON approach for any reason, flag it and we'll discuss, but the default is Deploy Hook + prebuild.)

---

## 5. Rendering surfaces

All read from the one `wire.json`; filter in the components, don't fetch twice.

- **Front-page wire:** `role: 'anchor'` items only, newspaper columns (headline, source, timestamp, link out). This is the lead body of the front page.
- **Around the Teams:** one latest headline per team, logo + headline, from anchor feeds. All seven named (per the tiering decision).
- **Per-team interior pages:** that team's full set (anchor + depth) on its `/team` page.
- **206 Fix videos:** auto-pull from your YouTube channel RSS (`https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}`). Resolve the channel ID and add it to config. Note: the channel feed lists latest uploads but does NOT cleanly separate Shorts from long-form, so treat it as "latest uploads" and don't over-engineer a Shorts split.
- **Community pulse:** top posts from r/Mariners, r/Seahawks, r/SeattleKraken via subreddit RSS (`https://www.reddit.com/r/{sub}/top/.rss?t=day`). Separate visual texture from the editorial wire. Reddit requires a descriptive User-Agent or it rate-limits.
- **Podcast wall (optional):** Seattle sports podcasts are RSS too, same mechanism. Ship it only if the core wire is solid.

---

## 6. Copyright rule (build this in, not optional)

This is an aggregator that drives traffic TO sources, not a mirror that replaces them. So:

- Render **headline + source + timestamp + link out**. Always link to the original.
- Snippets, if shown at all, are **short** (roughly a sentence, hard-truncated) and taken from the feed's own description field. Never reproduce full article text.
- Never republish an article body, even if the feed includes full content. Truncate hard.

This is both the right thing legally and the thing that makes you a hub instead of a worse ESPN. The curation and the link-out are the value.

---

## 7. Verification before calling Phase 2 done

- Every source in the feeds sheet either fetches or falls back cleanly; log the resolved set.
- Official .com feeds that are dead correctly fall back to Google News.
- De-dup works: the same story from two feeds appears once.
- Seattle filter holds: no off-topic items on the wall.
- Front-page wire shows anchor items; team pages show full sets; Around the Teams shows one per team, all seven named.
- 206 Fix videos and community pulse render.
- A deliberately broken feed URL does not break the build.
- Headlines link out; no full article bodies rendered.
- Prebuild runs the script; a Deploy Hook triggers a fresh rebuild; typecheck clean, build green.
- Checked on the Vercel preview, desktop and phone.

---

## 8. What NOT to do

- **Don't fetch feeds client-side.** Build-time only (§2).
- **Don't reproduce article bodies.** Headline + snippet + link out (§6).
- **Don't commit regenerated JSON to main on a cron.** Deploy Hook + prebuild (§4).
- **Don't let one dead feed break the build.** Skip and log (§3).
- **Don't dump all ~25 feeds on one wall.** Anchor on the front page, depth on team pages (§5).

---

## Session kickoff prompt

```
Reference the "new site plan" folder. We're on Phase 2 — auto-feeds — per
206-fix-phase2-feeds.md. Read that spec and 206-fix-rss-feeds.md in full, and look at the
preserved fetch-rss.mjs in _archive/astro-site/ as a starting point.

Constraints:
- Phase 2 only. Fresh branch off main. Don't merge until I review a preview.
- Build-time aggregation only; feeds are NOT fetched client-side.
- Config-driven sources; official feeds fall back to Google News when dead.
- De-dup by title/URL; Seattle-only filter; anchor vs depth roles.
- Headlines link out; never render full article bodies.
- Prebuild step generates the JSON; schedule rebuilds via a Vercel Deploy Hook, not
  bot commits to main.

Before writing code: give me your plan — the source config shape, the fetch/fallback/
de-dup pipeline, the JSON output shape, and how the wire, team pages, Around the Teams,
video feed, and community pulse each read from it. Wait for my go-ahead.
```
