# DORMANT

Paused August 2026.

Every factual claim below was checked against the code on 2026-08-23. Where the
three root docs (README.md, WORKFLOW.md, THE_206_FIX_PROJECT_DOCS.md) contradict
the code, that is called out rather than resolved — see "Where the docs and the
code disagree," last section. Trust the code.

## Why

Time. Writing, family, work, and Praetorian take priority. The site was never
the thing costing hours; the video pipeline was. Recording is stopped. The site
stays up because it costs nothing and holds the ground.

Not abandoned. If writing expands later, this is a ready-made platform.

## What this actually is

Vite + React 18 + TypeScript, prerendered to static HTML by **vite-react-ssg**
(`package.json`). Plain CSS — CSS Modules per component plus `src/styles/tokens.css`
and `src/styles/global.css`. No Astro. No Tailwind. No Markdown, no content
collections: `src/content/` does not exist and there are zero `.md` files under
`src/` or `public/`.

Routes are declared in `src/routes.tsx`: `/`, `/scores`, `/teams`, one page per
team from `src/lib/teams.ts`, plus `/this-day`, `/almanac`, `/highlights` and
`/privacy` — those four are **stub pages** (`src/pages/StubPage.tsx`), labelled
Phase 3 and Phase 6, never built out. The three Phase 3 stubs and `/teams` are
unlinked and noindexed as of the dormant pass below; `/privacy` is untouched.

## The dormant pass (2026-08-23)

Two commits, after this file was first written:

- **`ab3d519`** — hid the sections: nav and footer links, `noindex`, sitemap.
- **`3b2216b`** — removed the front-page placeholder strip.

**Everything is hidden, not deleted.** Every block is tagged with a
`DORMANT 2026-08` comment explaining what was removed and how to put it back, so
`grep -rn "DORMANT 2026-08" src scripts` finds the whole pass — seven blocks in
seven files (`SectionNav`, `Colophon`, `HomePage`, `StubPage`, `TeamsIndex`,
`routes.tsx`, `generate-seo.mjs`).

### What the site looks like now

- **Section bar:** Scores. That is the entire primary nav.
- **Footer:** Front Page · Scores · Privacy.
- **Front page:** lead story → The Wire → Around the Teams → The Film Room.
  It ends there. No placeholders, and no `Phase N` badge anywhere on it.
- **Hidden** (unlinked, `noindex, follow`, no canonical, out of the sitemap):
  `/teams`, `/this-day`, `/almanac`, `/highlights`. All four still resolve.
- **Still public and indexed:** `/`, `/scores`, `/privacy`, and the seven team
  pages. Sitemap is 10 URLs, down from 14.

What changed:

- `src/components/SectionNav.tsx` — the section bar is now **Scores only**.
  Teams, This Day, Almanac and Highlights removed.
- `src/components/Colophon.tsx` — the footer is now **Front Page · Scores ·
  Privacy**. This Day, The Almanac, Highlights and all seven per-team links
  removed.
- `src/pages/HomePage.tsx` — the entire "coming later" placeholder strip
  removed: "On This Day" and "Inside This Edition" (Phase 3, both advertising
  now-hidden sections) and "Card of the Day" (Phase 4). Nothing is being built
  while the site is paused, so the strip promised work that is not coming, and
  its phase badges leaked internal build numbering to readers. The front page
  now ends at the Film Room. The `.stubs`/`.stub`/`.badge` CSS is left in
  `HomePage.module.css` for the restore.
- `src/routes.tsx` + `src/pages/StubPage.tsx` — the three Phase 3 routes are
  **kept and still resolve**, but render `noindex, follow` with no canonical.
  `StubPage` gained an optional `noindex` prop to carry this.
- `src/pages/TeamsIndex.tsx` — `/teams` gets the same treatment. Losing its nav
  entry left it with no inbound internal link, and an indexed orphan is worse
  than a hidden one, so it is noindexed rather than left dangling.
- `scripts/generate-seo.mjs` — all four are excluded from `sitemap.xml`, which
  went from 14 URLs to 10. The exclusion list and the `noindex` props must be
  changed together; a noindexed URL listed in a sitemap is a contradictory
  signal.

What deliberately did **not** change:

- The seven team pages are still built, still populated from the wire, **still
  indexed and still in the sitemap**. Only the menu entries and the `/teams`
  section front were hidden — the team content itself was not.
- Around the Teams on the front page still links to each team page, so those
  seven stay internally linked and crawlable without `/teams`.
- No content, collection, component or route was deleted.
- `/privacy` is untouched: still linked in the footer, still indexed.
- The four hidden pages still render their `Phase 3` / `Phase 6` badges. They
  are unlinked and noindexed so nobody should land on one, but the badges were
  not scrubbed. Cheap to do if it ever matters.

### How it was verified

Against `dist/` after a real build, not by reading the source:

- Zero `href="/teams"`, `/this-day`, `/almanac`, `/highlights` on the front page
  or on a team page.
- All four hidden pages emit `noindex, follow` and **no** canonical.
- `/`, `/scores`, `/mariners`, `/privacy` all still emit a canonical and no
  `noindex` — the hiding did not bleed into the live pages.
- `sitemap.xml` = 10 URLs; the four are absent.
- Front page contains no `Phase 3`, `Phase 4`, `Card of the Day`, `On This Day`
  or `Inside This Edition` string, and still contains The Wire, Around the Teams
  and The Film Room.
- `npm run typecheck` and `npm run build` clean before each push.

Worth repeating these if the pass is ever partially reversed — checking the
built HTML catches what reading the components does not.

### Open, deliberately not done

**The four hidden URLs were already indexed by Google.** `noindex` only takes
effect when Googlebot recrawls, typically days to a few weeks, so they can keep
appearing in results for a while after this pass. Search Console's Removals tool
hides a URL in about a day and the `noindex` then makes it stick. Judged not
worth it for four low-traffic pages on a paused site — revisit if one of them
actually shows up somewhere embarrassing.

## What is still live and running itself

- Site serves from Vercel, free tier, auto-deploy on push to main.
  Config in `vercel.json` (framework `vite`, output `dist`, `cleanUrls`,
  `/standings` → `/scores` 301).
- **Feed aggregator: `scripts/fetch-feeds.mjs`**, source list in
  `scripts/feeds.config.mjs`. Runs at build time (`prebuild` → `npm run
  feeds:fetch`) and writes `src/data/feeds.json`, which is **gitignored**
  (`.gitignore:16`) — it is a build artifact, not committed state. Read through
  `src/lib/feeds.ts`. Exits via `process.exit(0)` and never fails the build.
- **25 configured sources**, not 11. Teams covered: local, mariners, seahawks,
  kraken, sonics, sounders, storm, reign. At the last local fetch (2026-07-26)
  all 25 resolved, 0 failed, 5 of them via the Google News fallback.
- **There is a Sonics feed** — `{ team: 'sonics', name: 'Sonics News' }`, an
  empty URL that self-heals to a Google News return-watch query
  (`GOOGLE_NEWS_QUERY.sonics`). It is not original writing.
- **Two schedulers, not one:**
  - Primary: **Vercel Cron** in `vercel.json` → `/api/refresh-feeds`
    (`api/refresh-feeds.ts`), three daily entries at 01:00, 13:00 and 19:00 UTC.
    Three separate entries because Vercel Hobby caps a cron expression at
    once per day. Do not merge them into one.
  - Backstop: `.github/workflows/refresh-feeds.yml`, **once daily at 07:00 UTC**,
    deliberately off the Vercel hours. It was demoted from primary because
    GitHub's free scheduler drifted 1.2–3.5 h on every run over 2026-07-23..26;
    the evidence is in the workflow's header comment. Not every 2 hours.
  - Both paths POST the same Vercel Deploy Hook and trigger a rebuild. **Neither
    commits to the repo.**
- Masthead date, edition, and volume: `src/lib/edition.ts`, pinned to
  America/Los_Angeles and to **build** time via the `__BUILT_AT__` define — the
  comment there explains why (render-time `new Date()` caused a hydration
  mismatch and a visible flicker). Correct with no input.
- **Film Room strip: automated, not static.** `src/components/FilmRoom.tsx`
  renders up to 6 cards from the channel's uploads feed, pulled by
  `fetchVideos()` in `scripts/fetch-feeds.mjs`. Hidden when there are none.
- `postbuild` runs `scripts/generate-seo.mjs`, which derives `dist/robots.txt`
  and `dist/sitemap.xml` from the HTML actually emitted.
- Domain the206fix.com. Keep renewing it.

### Things the old docs promise that do not exist in this codebase

- **No coin-op footer gag.** No CoinOp component, no "INSERT COIN" / "PRESS
  START" string anywhere in `src/`. The footer is `src/components/Colophon.tsx`:
  a nav, the wordmark, and a tagline.
- **No site RSS feed.** Nothing emits `/rss.xml`; the only XML in `dist/` is
  `sitemap.xml`.
- **No ticker.** No `src/data/ticker.ts`.
- **No About page**, hidden or otherwise.
- **No `src/config.ts`**, and therefore no byline constant.

## Open threads, unfinished at pause

Kept as written at pause. Where the code contradicts one, a VERIFIED note says
so — the thread itself is left alone.

- **Font migration. Spec written, never executed.** FONT_MIGRATION_V1.md.
  Locked target: Jacquard 24 for the masthead title only, Press Start 2P for
  everything else at 10px, 1.5 line-height, -0.5px letter-spacing. Retires
  Bitcount Grid Single and Bitcount Prop Single. CRITICAL: Press Start 2P renders
  roughly twice the visual size of Bitcount at the same px value. The font swap
  and the resizing pass must ship in the same commit or the live site breaks.
  Do this in one coordinated pass, Claude Code.

  > VERIFIED 2026-08-23: **FONT_MIGRATION_V1.md is not in the repo.** Neither is
  > Jacquard 24 nor either Bitcount face — they appear in no CSS, no `index.html`
  > link, and no token. The live type stack is **five** fonts, loaded in
  > `index.html:18` and mapped in `src/styles/tokens.css:22-26`:
  > Manufacturing Consent (nameplate), Anton (headlines), Libre Baskerville
  > (body), VT323 (data/scores), Press Start 2P (small accents). That is the v3
  > "Manufacturing" direction in `new site plan/206-fix-v3-manufacturing.html`.
  > This thread describes a migration between two type systems the code no
  > longer uses at either end. Re-spec it against the five-font stack before
  > acting on it, and do not treat the 2× sizing warning as applying here.

- **Almanac collapse. Decided, not built.** Merge Almanac, This Day in Seattle
  Sports, and Famous Plays into one collection keyed by date, team, and writing.
  On This Day becomes a front-page query against it. Highlights disappears from
  nav. OPEN QUESTION, answer before implementing: do Almanac entries carry a
  single date or a date range?

  > VERIFIED 2026-08-23: accurate as an intention. `/almanac`, `/this-day` and
  > `/highlights` exist as Phase 3 stubs in `src/routes.tsx`. There is no Famous
  > Plays route and no collection mechanism of any kind to merge into — this is
  > a build, not a merge. As of the dormant pass the three are unlinked and
  > noindexed; building this thread means un-hiding them first.

- **Film Room RSS automation. Blocked.** Pull the YouTube channel into the Film
  Room strip via RSS using the existing GitHub Actions cron and fetch-rss.mjs.
  Output to its own data file, do NOT append to The Wire array. Blocked on
  supplying the channel ID (UC..., in YouTube Studio > Settings > Channel >
  Advanced Settings).

  > VERIFIED 2026-08-23: **done, not blocked.** The channel ID is resolved and
  > committed — `YOUTUBE_CHANNEL_ID = 'UCFS_B5W-vRNXQa6G3LYwmwA'` at
  > `scripts/feeds.config.mjs:97`. `fetchVideos()` reads
  > `youtube.com/feeds/videos.xml?channel_id=…` and writes a separate `videos`
  > array in `src/data/feeds.json`, kept out of `wire` exactly as this thread
  > asks. 3 videos were present at the last fetch. Nothing to do.

- **Film Room layout.** Six full-width stacked thumbnails dominate the front
  page. A three-across CSS grid is the highest-return visual fix available.

  > VERIFIED 2026-08-23: still open. `FilmRoom.tsx` slices to 6; the layout is
  > whatever `.videos` does in `src/components/feed.module.css`.

- **Around the Teams and The Wire duplicate each other heavily.** Unresolved.

  > VERIFIED 2026-08-23: still open, and the mechanism is visible in
  > `src/lib/feeds.ts` — `anchorWire()` and `aroundTheTeams()` both select from
  > the same `role: 'anchor'` pool, so the overlap is structural.

- **THE_206_FIX_PROJECT_DOCS.md has drifted** from actual state, particularly on
  fonts. Needs a full rewrite before any further build work.

  > VERIFIED 2026-08-23: understated. All three root docs describe the retired
  > Astro site, not just on fonts. See the last section.

- **Logo, never built.** Retro arcade TOKEN concept. Round. Space Needle,
  skyline, Rainier, big "206" focal point, curved "206 FIX" top and
  "GOOD FOR 1 FIX" bottom. Site palette, brass/rust token feel. Doubles as
  avatar, favicon, and the footer coin.

  > VERIFIED 2026-08-23: still open. `public/favicon.svg` is currently a
  > hand-drawn 16×16 pixel "206" in the site palette (forest + rust) — a real
  > asset, not a placeholder, but not the token. There is no footer coin for a
  > logo to double as.

- **Channel art does not match the site.** Navy and bright Seahawks green.
  Rebrand to site palette whenever. Keep the two FanCard pixel player cards
  (Largent, Griffey), they are good and on-aesthetic.

  > Off-repo; nothing to verify here.

## Conventions that still apply

- **There is no byline.** `src/config.ts` does not exist and no `Two Oh Six`
  string appears anywhere in `src/`. THE_206_FIX_PROJECT_DOCS.md:69-71 records
  the byline, the author page, and that config as deliberately removed. If
  original writing comes back, the byline is an open decision.
- Do NOT use "Mike Thunder" — separate persona, and "Thunder" salutes the team
  that took the Sonics.
- **Teams are the seven in `src/lib/teams.ts` and `scripts/feeds.config.mjs`:
  Seahawks, Mariners, Kraken, Sonics, Sounders, Storm, Reign**, plus a `local`
  cross-team bucket. Sounders, Storm and Reign each have configured sources and
  a Google News query.

  **Coverage widened August 2026, deliberately.** The earlier "big four, no
  Sounders" rule governed original writing, not aggregation. With no original
  writing being published, complete coverage costs nothing, serves more of the
  Seattle sports audience, and the women's teams deserve the coverage. Revisit
  only if written coverage resumes.
- `npm run build` before every push. Non-negotiable. It runs `feeds:fetch`
  first and `generate-seo.mjs` after.
- `git commit -am`, and `git pull --rebase` first. **Note:** the rebase habit is
  worth keeping, but the stated reason is gone — no bot commits to this repo any
  more. Both schedulers fire a deploy hook and `src/data/feeds.json` is ignored.
- Design system: the palette and layout live in `src/styles/tokens.css`. Treat
  that file and `new site plan/206-fix-v3-manufacturing.html` as the reference,
  **not** the design section of THE_206_FIX_PROJECT_DOCS.md.
- The phase specs in `new site plan/` (`206-fix-build-checklist.md`,
  `206-fix-phase1-scoreboard.md`, `206-fix-phase2-feeds.md`,
  `206-fix-rss-feeds.md`) match the code. They are the accurate docs.

## Where the docs and the code disagree

All three root docs describe the **retired** Astro aggregator. They are kept
here as history; none of them should be followed. Not resolving these — just
recording both sides.

| Claim in the root docs | What the code does |
|---|---|
| "Astro + Tailwind CSS" (DOCS:45, README:5) | Vite + React + vite-react-ssg, plain CSS Modules |
| Markdown content collections, `src/content/config.ts` (DOCS:83-84) | No `src/content/`, zero markdown files |
| `src/scripts/fetch-rss.mjs`, SOURCES, 10 feeds, writes `src/data/rss-feed.json` (DOCS:106-109) | `scripts/fetch-feeds.mjs` + `scripts/feeds.config.mjs`, 25 sources, writes `src/data/feeds.json` |
| "GitHub Actions cron every 2 hours" (DOCS:47, README:5, WORKFLOW:50) | Vercel Cron 3×/day primary; GH Actions once daily as backstop |
| "Fonts — exactly two: Press Start 2P + Jacquard 24" (DOCS:55-61) | Five: Manufacturing Consent, Anton, Libre Baskerville, VT323, Press Start 2P |
| Coin-op footer gag (DOCS:114-115, README:44) | No such component or string |
| Site RSS at `/rss.xml` (DOCS:88, WORKFLOW:48) | Not emitted; only `sitemap.xml` |
| Ticker, `src/data/ticker.ts` (DOCS:97-100, WORKFLOW:27) | Does not exist |
| About page `src/pages/about.astro` (DOCS:110) | Does not exist |
| `src/config.ts` site constants (README:45) | Does not exist |
| One front page, videos + Wire only (README:10-15) | Multi-page: `/scores`, `/teams`, 7 team pages, 4 stubs |
| `npm run rss:fetch`, dev on :4321 (README:26-27) | `npm run feeds:fetch`; `vite.config.ts` sets no port, so Vite's default :5173 |
| "the RSS bot commits between my pushes" (DOCS:129, WORKFLOW:75) | Nothing commits; feed JSON is gitignored |

## If restarting

Read this file first. Then read the phase specs in `new site plan/` — those are
the accurate documentation. Treat README.md, WORKFLOW.md and
THE_206_FIX_PROJECT_DOCS.md as historical until they are rewritten; rewriting
them is the first job, and this file's disagreement table is the checklist for it.

The old advice was "do the font migration first." That still holds in spirit —
type settles everything downstream — but the migration as specced targets fonts
this codebase does not use at either end, and its spec file is missing. Decide
what the type system should be against the five fonts that are actually loaded
before touching anything else.

Next unbuilt work, if it resumes, is Phase 3: the `/this-day`, `/almanac` and
`/highlights` stubs.

**Un-hiding is the first step, and it is four things, not one.** Run
`grep -rn "DORMANT 2026-08" src scripts` — seven blocks, each commenting what it
removed and how to restore it. For any page you bring back you must, together:
drop its `noindex` prop, remove it from `EXCLUDE` in `scripts/generate-seo.mjs`,
and re-add its link in `SectionNav.tsx` and/or `Colophon.tsx`. Doing only some
of those leaves a page that is either linked but unindexable, or indexed with no
way to reach it. Rebuild and check `dist/` afterwards — the verification list
under "The dormant pass" is the checklist.

Bringing back `/teams` is separate from bringing back the Phase 3 stubs; it was
hidden only because it lost its nav entry, not because it is unfinished. It
works right now.
