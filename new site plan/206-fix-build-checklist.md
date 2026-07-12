# THE 206 FIX — Build Checklist

A Seattle sports hub. Retro newspaper skin, 8/16-bit accents, self-updating so it runs without you.

**How to use this:** work top to bottom. Phases are ordered by payoff against effort. If you only ever finish Phases 0–2, you already have a working daily habit for Seattle fans. Everything after that compounds on top without demanding your time. Each item is a checkbox. Notes in *italics* are the honest gotchas, not filler.

---

## LOCKED DECISIONS (don't re-open these)

- Multi-page site, not one long homepage. Evergreen pages need their own URLs to rank on Google. This is the discovery engine.
- Build-time RSS aggregation. A script fetches feeds at build, writes JSON, site ships static. Vercel triggers rebuilds on a timer. Nothing runs between builds.
- Scoreboard stays client-side against ESPN endpoints (same as your old Sports Hub). RSS goes through build-time. Evergreen content is static data files that fetch nothing.
- Pro Seattle only for launch. College (UW/WSU) shelved. No newsletter, no comments, no forum, no live game threads. All three violate the zero-time rule.
- **Seven teams covered: Mariners, Seahawks, Kraken, Sonics (returning), Sounders, Storm, Reign.** A hub named for Seattle should cover the full range, and the Storm, Sounders, and Reign are decorated franchises that deserve inclusion.
- **Breadth by automation, depth only where you have real knowledge.** All seven get scoreboard tiles and RSS feeds (costs nothing, automated). Only the teams you actually follow get hand-built evergreen content (This Day entries, cards, Almanac pages). Don't fake depth on teams you don't know; let the auto-layer carry them.
- **Tier by prominence, name everything.** Big four (Mariners, Seahawks, Kraken, Sonics) get front-page prominence (featured placement, feeds surfaced higher) and full interior team pages with the hand-built depth. The other three (Sounders, Storm, Reign) still appear on the front page via the named Around the Teams block, and each still gets its own labelled, feed-only interior page. The tier shows up in size and depth, never in whether a team is named. No anonymous "misc" bucket: burying the Storm/Sounders/Reign reads as relegating decorated franchises (two of them women's teams) and any Seattle fan notices.
- "Of the week" features are pre-loaded rotating queues, never manual weekly picks.
- **Team marks: use official team logos.** Editorial use, the same well-worn lane every Seattle fan blog runs in. It's tolerated-not-licensed, so the worst realistic case is a takedown request; if a league ever objects, swap the mark. Low risk, and it saves building custom pixel art for six teams.
- **Clip guardrail: embed, never rehost.** Highlights and the Ultimate reel embed existing YouTube videos so liability stays with the uploader. Never download and re-upload broadcast footage. If an embed dies, swap it (the dead-link sweep already covers this). Logos are low risk; hosted clips are not.
- Amazon affiliate is Phase 6, after real traffic exists. Wire the slots now, apply later.

---

## PHASE 0 — Foundation

The plumbing everything else sits on. Do this first or nothing else works.

- [ ] Confirm stack: Vite + React + TypeScript. Same stack as Reading Room and Sports Hub.
- [ ] New repo under Bison1881, local + GitHub.
- [ ] Wire the repo to Vercel for deploys.
- [ ] Point the-206-fix.com at the Vercel project.
- [ ] Set up routing for a multi-page structure (front page + interior pages).
- [ ] Drop in the design tokens from the mockup (palette, three fonts, rules). See DESIGN SYSTEM at the bottom.
- [ ] Build the shared shell: masthead, folio line, footer/colophon. Every page inherits these.
- [ ] Confirm mobile collapse works: scoreboard, then lead story, then features, single column.

*Gotcha: get the CSS token system and the shared shell right here. Retrofitting a design system across pages later is miserable.*

---

## PHASE 1 — The Scoreboard (Tier 0, the daily habit)

The reason people return. Biggest single build, highest return. It looks like the hard feature but it's the easy one, because ESPN endpoints are friendly to client-side calls.

- [ ] Port the ESPN fetch logic from the old Sports Hub app.
- [ ] Scoreboard strip on the front page: Mariners, Seahawks, Kraken, Storm, Sounders. (Sonics as a legacy/returning nod until the franchise is real.)
- [ ] Live score + inning/quarter/period, in the terminal font (VT323).
- [ ] LIVE indicator with the blinking dot. Respect reduced-motion.
- [ ] Offseason empty state per team: a countdown or "next game," never a blank tile. This is what makes it look alive year-round.
- [ ] Standings page: full standings per league.
- [ ] Next-game-per-team on the front page.
- [ ] Poll for refresh on live games. Don't hammer the endpoint; a sane interval.
- [ ] Handle the endpoint failing gracefully. If ESPN is down, the tile says so, the page doesn't break.

*Gotcha: ESPN's unofficial endpoints can change without notice. Isolate the fetch layer so if an endpoint shifts, you fix one file, not the whole site.*

---

## PHASE 2 — Auto-Feeds (Tier 1, cheap wiring, high freshness)

The body of the newspaper. Light lift once the build-time fetch pattern exists. Reuse that pattern for all three blocks below.

- [ ] Build the build-time aggregation script: fetch feeds, write to a JSON file in the repo.
- [ ] Set the Vercel scheduled rebuild (start with a few times a day; tune later).
- [ ] **Article wall:** curated Seattle-only RSS, laid out as newspaper columns. Headline, source, timestamp, link out.
- [ ] Wire the source list. The full ~25-feed list across all seven teams plus cross-team locals lives in `206-fix-rss-feeds.md`. Confirm a working RSS feed per source before adding (official .com sites mostly need a Google News fallback).
- [ ] Split feeds by role: anchor feeds surface on the front-page wire + Around the Teams; the rest feed the per-team interior pages. De-dup by title/URL at build.
- [ ] **Build the official-feed fallback into the aggregation script.** For any source flagged "official," try its feed first; if it errors or returns zero items, automatically swap to that team's Google News RSS query. Self-heals every build, so a dead .com feed can never leave a gap, whether it dies at launch or years later. Query format + per-team strings are in `206-fix-rss-feeds.md`.
- [ ] **206 Fix videos + Shorts:** auto-pull from your own channel's YouTube RSS feed. Trivial once the fetch pattern exists.
- [ ] **Community pulse:** top posts from r/Mariners, r/Seahawks, r/SeattleKraken via their RSS. Adds fan texture a pure news wall lacks.
- [ ] (Optional now or later) **Podcast wall:** Seattle sports podcasts are RSS too. Same mechanism.

*Gotcha: this is the block with the real constraint. Browsers block client-side cross-domain RSS fetches, which is exactly why this goes through build-time, not the browser. If a feed refuses to parse, it's usually a format quirk. Skip the bad feed rather than letting it break the build.*

---

## PHASE 3 — Evergreen (Tier 2, your discovery engine)

Build-once, no cadence, and the part strangers actually find on Google. This is where SEO growth lives while you focus on Mike Thunder.

- [ ] **This Day in Seattle Sports History:** a rotating box on the front page + a full archive page.
- [ ] Build the dataset. This is content work, not code. Keyed to today's date. *(Your single best SEO asset. Worth the writing time.)*
- [ ] **Per-team interior pages:** one labelled page per team, auto-fed by that team's feeds. Big four pages get the hand-built extras (This Day entries, cards, records) over time; Sounders/Storm/Reign pages run feed-only. All seven are named; depth differs, naming doesn't.
- [ ] **Ultimate Highlights reel:** embed a curated YouTube playlist of the greatest Seattle moments (Griffey's dash, the Super Bowl, Beast Quake, the Sonics title, Buhner's cycle, Ichiro).
- [ ] Add clips whenever you find them. Untimed, no obligation.
- [ ] Lean toward clips on official/league channels; they survive takedowns longer.
- [ ] Schedule an occasional dead-link sweep. Those clips live on other people's channels and will die on you.

*Gotcha: History and the Almanac are thin until you fill them with real knowledge. Budget content time here, not code time. This is the block only you can build.*

---

## PHASE 4 — Rotating Queues (Tier 3, polish that costs nothing after setup)

Build the rotation engine once, feed it once, it runs on a date forever.

- [ ] Build the generic "rotate by date" engine. Reuse it for all three below.
- [ ] **Card of the day:** the pixel trading card, generated from your data. This is the site's signature element.
- [ ] Load the card queue once (a set of Seattle legends/moments). Site rotates automatically.
- [ ] **Seattle YouTube channel spotlight:** a fixed set of channels the site rotates through. Not a weekly pick.
- [ ] **Countdown clocks:** days until Seahawks camp, next Mariners homestand, puck drop. Pure build-once, very on-brand.

---

## PHASE 5 — Your Writing Slot (Tier 4, optional, ignore at will)

- [ ] Add a column slot that appears when filled and vanishes when empty.
- [ ] Fill it when you feel like it. Zero obligation. The site looks complete empty.

---

## PHASE 6 — Affiliate Layer (phase two, DO NOT start early)

Wire the slots now. Apply to the program only after the site has real Seattle traffic.

- [ ] Now: build "The Shelf" section into the Almanac (essential Seattle sports books). Leave links inert for now.
- [ ] Now: add a privacy policy page.
- [ ] Now: add the site-wide disclosure line to the footer/About.
- [ ] Later: once traffic is real and you have ~10 posts of content, apply to Amazon Associates.
- [ ] Later: join the **US** program, not the AU one. Your audience shops Amazon.com. An .com.au link earns nothing from a Seattle fan.
- [ ] Later: add the exact required phrase "As an Amazon Associate, I earn from qualifying purchases" on every page with links.
- [ ] Later: near-link disclosures ("paid link") next to each affiliate link.
- [ ] Later: never hardcode prices. Use "Check price on Amazon" or live API data.
- [ ] Later: (optional) geo-route US/AU links with a tool like Geniuslink.

*Gotcha: the 3-sale rule. You must drive 3 qualifying sales within 180 days of approval or Amazon closes the account. The clock starts at approval. A brand-new site with no traffic will blow it. This is why it's Phase 6, not Phase 1. Set expectations: physical goods pay 1–4.5% on a 24-hour cookie. This covers hosting, it doesn't pay you.*

---

## FUTURE PROJECTS (downstream, not part of the site build)

**"50 Defining Moments in Seattle Sports History" — illustrated book.**
Not a separate project. It's the This Day dataset, the Almanac, and the Highlights research repackaged into a sellable product. Do the research once, use it four ways (This Day, Almanac, Highlights, book).
- The obstacle is images. Historic sports photos are owned by Getty and the wire services; licensing them for a book you sell is expensive and strict. Do not build on photos you don't own.
- The solution that fits the brand: illustrate it in the pixel/retro-newspaper style of the Card of the Day. Original art you own outright, no licensing, and a distinctive product no photo book can copy. This extends your one signature element into print.
- Status: future project. Downstream of the site's evergreen content. Wants to be professional, so treat rights and art quality as the gating items.

**Watch: SuperSonics return.** Multiple local sources are now treating a Sonics rebirth as "coming soon." If it firms up, the Sonics tile becomes a live team, Sonics Rising upgrades to real beat coverage, and the returning franchise is a genuine traffic event worth building around.

**Watch: AUSL Seattle expansion.** The pro softball league (MLB-backed, ESPN deal, softball back at the 2028 Olympics) went to six city-based teams for 2026. No Seattle team yet, and the nearest is the Portland Cascade (Hillsboro, OR), which does NOT belong on a Seattle hub. If the league ever expands to Seattle, add that team. The rule: any team that plays in Seattle earns a place; a team that doesn't, however much you'd like to support it, breaks the name.

---

## NEWSPAPER FURNITURE (borrowed from real Seattle Times sports layouts)

Conventions that make the page read as a genuine sports section. Add during the relevant phase.

- [ ] **Series/playoff tracker** (Phase 1, scoreboard): a row of W/L bubbles showing where a playoff series stands. Retro, data-driven, only appears during a series.
- [ ] **Banner headline** (front page): the lead story gets one oversized, witty, *unlabelled* headline. No kicker above it. The headline size does the work.
- [ ] **Photo caption style**: italic line under any hero image, crediting the source. Small detail, big authenticity.
- [ ] **"Inside this edition" teaser strip** (front page, bottom): a row pointing to interior pages (This Day, Almanac, Highlights) with a teaser each. Doubles as internal navigation, which helps the evergreen pages get found. Newspaper convention + SEO in one element.
- [ ] **"Around the Teams" digest** (fed by Phase 2 article wall): one headline per team with the team logo in a left rail. The cleanest way to serve all six teams at a glance. This is how the Storm and Sounders stay present and respected with zero writing from you.

---

## DESIGN SYSTEM (reference)

**Concept:** authentic vintage Seattle sports broadsheet, with one pixel touch. The newspaper register (blackletter nameplate, halftone photos, banner headlines, dense columns, columnist mugs, scores banded across the top) is dominant and carries the page. Pixel survives in exactly one element: the trading card (plus a few tiny UI accents). This matches the real Seattle Times sports fronts (1979 Sonics, 2000, 2011) used as reference. The card is the differentiator that says "retro sports + retro games"; everything else is period-accurate newsprint.

**Masthead (LOCKED).** "The 206 Fix" in **Manufacturing Consent** (Google Font, a New York Times masthead blackletter), all black, title case, sized to crown the page above the banner headline. Chosen for authority + zero licensing friction. The score ribbon sits *below* the nameplate so nothing competes above it. The footer wordmark matches. Canonical mockup: `206-fix-v3-manufacturing.html`.

**Palette (5 colors, cheap two-spot-color print look):**
- Newsprint base: `#E5E1D6` (aged grey-tan, deliberately not clean cream)
- Press ink: `#1A1A17` (faded near-black)
- Hairline rule: `#B4AE9C`
- Spot one (accent): `#0F6E63` Northwest teal (team-neutral on purpose)
- Spot two (alerts only): `#C4392E` faded newspaper red (LIVE, urgent)

**Type (4 registers, each one job):**
- Nameplate — Manufacturing Consent (blackletter). Masthead + footer wordmark only.
- Newspaper — Libre Baskerville (article body) + Anton (condensed headlines). Carries the reading.
- Terminal — VT323. Data only: scores, timestamps, stat lines.
- Pixel — Press Start 2P. The trading card + a few tiny accents. Never body.
- *Discipline: the serif carries the meal; terminal and pixel are seasoning. Body serif is swappable (PT Serif, Lora, Spectral, Source Serif) if it ever reads too clean.*

**Layout:** newspaper grid. Scoreboard hero above the fold, three-column body below (wire columns lead, sidebar rail right). Hairline and double rules divide sections.

**Motion:** almost none. Blinking LIVE dot, that's it. Reduced-motion respected.

**Signature:** the pixel trading card. Now the *only* pixel element, so it carries the retro-gaming identity on its own. Owes nothing to Nintendo, so it survives the YouTube channel receding.

---

## THE GOVERNING RULE

Everything on this site either updates itself or is build-once. If a feature needs you to touch it on a schedule, it doesn't belong here. The one exception is content you *want* to add (highlights, your writing slot), and those are untimed by design. Protect this rule and the site grows while you focus on Mike Thunder.
