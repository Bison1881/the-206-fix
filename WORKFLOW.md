# THE 206 FIX — Update Workflow

Your cheat sheet for posting after you record. Open this anytime until the
routine is second nature. The site is a low-maintenance aggregator now: the
only thing you publish by hand is the video. Everything else is automatic.

---

## The loop, start to finish

### OFF THE SITE (YouTube)
1. Play the game(s).
2. Edit and upload the video to YouTube.
3. Publish it. Copy the **video ID** from the URL:
   `https://www.youtube.com/watch?v=`**`dQw4w9WgXcQ`** ← that bold part.

### ON THE SITE (your project folder)
4. **Make the video post.**
   - Go to `src/content/videos/`.
   - Copy `_TEMPLATE.md`, rename the copy (e.g. `tecmo-week-03.md`).
   - Fill in the fields. Paste the YouTube ID into `youtubeId`.
   - `title`, `publishDate`, and `youtubeId` are the only required fields.
     Add a one-line `deck` blurb if you want; it shows on the card.
   - Set `draft: false` when it's ready.
5. **(Optional) Add the score to the ticker.**
   - Open `src/data/ticker.ts`.
   - Add a line under SCORES, e.g.
     `{ kind: 'score', text: 'TECMO S1 W3 · SEA 21  WAS 13 · FINAL', href: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },`
   - Add a `note` if you've got a joke or status line. This is your voice — have fun.
6. **Publish.**
   ```
   git add .
   git commit -am "New episode: Tecmo Week 3"
   git pull --rebase
   git push
   ```
   The site rebuilds in ~1-2 minutes. Done.

---

## What happens automatically (you do NOT touch these)

- The new video appears on the home page. The **newest one becomes the big lead**;
  the previous lead drops into the card row below.
- The card **image** defaults to the video's YouTube thumbnail (unless you set
  `customImage`).
- The **ticker** pulls your latest videos as linked "LATEST" headlines on its own.
- The site's own **RSS feed** (`/rss.xml`) includes the new video.
- The **date** and **Morning/Evening Edition** update on each rebuild.
- **The Wire** (Seattle sports news band) refreshes itself every 2 hours.

You update the SOURCE (one or two files). The site distributes it everywhere.

---

## The only things you ever edit by hand

| Thing               | File                            | When         |
|---------------------|---------------------------------|--------------|
| A video             | `src/content/videos/<name>.md`  | every video  |
| Ticker scores/quips | `src/data/ticker.ts`            | when you want |
| The About page      | `src/pages/about.astro`         | rarely       |
| Wire news sources   | `src/scripts/fetch-rss.mjs`     | rarely       |

---

## Gotchas

- **Don't rename a file to start with `_`** unless you want it hidden. The
  `_TEMPLATE.md` file is hidden on purpose — copy it, don't edit it.
- **`draft: true` hides a video.** Set it to `false` to go live.
- **The lead is automatic** — the video with the newest `publishDate` becomes the
  front-page lead. There's no "lead" switch anymore.
- **`git commit -am`**, not `git commit -a` (the latter opens a broken editor).
- **`git pull --rebase` before push** — the news bot commits between your pushes.
- The **YouTube ID** is just the code after `v=`, not the whole URL.
