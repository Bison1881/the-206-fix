# THE 206 FIX — RSS Feed Sources

The full source list, ~25 feeds across seven teams plus cross-team locals. Check each box once you've confirmed a **working RSS feed** at build time. Feeds go dark, so verify before wiring.

**Feed-availability rule of thumb:**
- **SB Nation** sites almost always have a feed (usually `/rss/index.xml`). Reliable.
- **FanSided** sites have a feed (usually `/feed`). Reliable.
- **Independent blogs** vary. Check each.
- **Official team / league .com sites** mostly dropped public RSS. Expect these to fail. Fallback: a Google News RSS query per team (`news.google.com/rss/search?q=...`) gives you clean official-ish coverage without a native feed.

---

## Cross-team locals
- [ ] seattleontap.com *(your pick — verify it has a feed)*
- [ ] Seattle Times — sports *(paywalled articles; headlines come through RSS, fine for link-out)*
- [ ] Seattle Sports 710 (mynorthwest)
- [ ] King 5 — sports

## Mariners
- [ ] Lookout Landing *(SB Nation — anchor)*
- [ ] Sodo Mojo *(FanSided)*
- [ ] Mariners.com *(official — likely needs Google News fallback)*

## Seahawks
- [ ] Field Gulls *(SB Nation — anchor)*
- [ ] 12th Man Rising *(FanSided)*
- [ ] Hawkblogger *(independent — verify)*
- [ ] Seahawks.com *(official — likely needs Google News fallback)*

## Kraken
- [ ] Sound Of Hockey *(anchor)*
- [ ] Davy Jones Locker Room *(independent — verify)*
- [ ] Kraken Chronicle *(FanSided)*
- [ ] Kraken.com *(official — likely needs Google News fallback)*

## Sonics *(no live team yet — legacy / return-tracking)*
- [ ] Sonics Rising
- [ ] Sonics Forever *(verify)*
- [ ] SeattleNBAFans.com *(verify)*

## Sounders
- [ ] Sounder at Heart *(SB Nation — anchor)*
- [ ] Sounders Nation *(independent — verify)*
- [ ] SoundersFC.com *(official — likely needs Google News fallback)*

## Storm
- [ ] High Post Hoops *(FanSided)*
- [ ] Seattle Storm on SI *(verify — SI/Arena feeds are inconsistent)*
- [ ] stormchasersbasketball.com *(independent — verify)*

## Reign
- [ ] Ride of the Valkyries / Sounder at Heart *(SB Nation — the Reign vertical; may share the Sounder at Heart feed)*
- [ ] ReignFC.com *(official — likely needs Google News fallback)*

---

## How to use these without becoming a worse ESPN

25 feeds is a firehose if you dump them all onto one wall. Split them by role:

- **Anchor feeds** (one or two per team, marked "anchor" above) surface on the front-page wire and drive **Around the Teams**.
- **The rest** feed the per-team interior pages, so depth lives where someone looking for it goes, not on the front page.
- **Dedup at build:** SB Nation, FanSided, and Google News will sometimes carry the same story. De-duplicate by title/URL so the wall doesn't repeat itself.

The curation is the value. The filter (Seattle-only, sorted, de-duped) is what makes this a hub instead of a mirror of everyone's feeds.

---

## Google News RSS fallback (for dead official feeds)

When an official `.com` feed returns nothing, use a Google News RSS query for that team instead. It self-updates and needs no native feed.

**Base format:**
`https://news.google.com/rss/search?q=QUERY&hl=en-US&gl=US&ceid=US:en`

The `hl=en-US&gl=US&ceid=US:en` params force US English results, which matches your (US) audience.

**Per-team QUERY values** (exact-phrase in quotes, `+` for spaces):

| Team | q= value |
|---|---|
| Mariners | `%22Seattle+Mariners%22` |
| Seahawks | `%22Seattle+Seahawks%22` |
| Kraken | `%22Seattle+Kraken%22` |
| Sonics | `%22Seattle+Sonics%22+OR+%22Seattle+SuperSonics%22` |
| Sounders | `%22Seattle+Sounders%22` |
| Storm | `%22Seattle+Storm%22+WNBA` |
| Reign | `%22Seattle+Reign%22+NWSL` |

Storm and Reign carry the `WNBA` / `NWSL` qualifier because "Seattle Storm" and "Seattle Reign" are otherwise ambiguous (weather, common words). The others are unambiguous on their own.
