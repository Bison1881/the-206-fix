# THE 206 FIX — Update Workflow

Your cheat sheet for posting after you record. Open this anytime until the
routine is second nature. Nothing here is automatic content — the writing is
always you. This just kills the busywork around it.

---

## The loop, start to finish

### OFF THE SITE (YouTube)
1. Play the game(s).
2. Edit and upload the video to YouTube.
3. Publish it. Copy the **video ID** from the URL:
   `https://www.youtube.com/watch?v=`**`dQw4w9WgXcQ`** ← that bold part.

### ON THE SITE (your project folder)
4. **Make the retro post.**
   - Go to `src/content/retro/`.
   - Copy `_TEMPLATE.md`, rename the copy (e.g. `tecmo-week-04.md`).
   - Fill in the fields. Paste the YouTube ID into `youtubeId`.
   - Write your couple sentences below the dashes.
   - Set `draft: false` when it's ready.
5. **(Optional) Add the score to the ticker.**
   - Open `src/data/ticker.ts`.
   - Add a line under SCORES, e.g.
     `{ kind: 'score', text: 'TECMO S1 W4 \u00B7 SEA 21  ARI 13 \u00B7 FINAL', href: '/retro/tecmo-week-04' },`
   - Add a `note` if you've got a joke or status line. This is your voice — have fun.
6. **(Optional) Write a column** if you have something to say.
   - Same idea in `src/content/articles/` using its `_TEMPLATE.md`.
7. **Publish.**
   ```
   git add .
   git commit -am "New episode: Tecmo Week 4"
   git pull --rebase
   git push
   ```
   The site rebuilds in ~1-2 minutes. Done.

---

## What happens automatically (you do NOT touch these)

- Home page Arcade section, `/retro` archive — your new post appears.
- The **ticker** pulls your latest posts as linked headlines on its own.
- Your **author page** (`/author/two-oh-six`) lists the new piece.
- The site's **RSS feed** includes it.
- A column also lands on the home page, Columns archive, and its team page.
- The **date** and **Morning/Evening Edition** update on each rebuild.
- The **From the Wires** sidebar pulls Seattle sports news every 2 hours.

You update the SOURCE (one or two files). The site distributes it everywhere.

---

## The only things you ever edit by hand

| Thing                | File                          | When            |
|----------------------|-------------------------------|-----------------|
| A retro episode      | `src/content/retro/<name>.md` | every video     |
| A column             | `src/content/articles/<name>.md` | when you write one |
| Ticker scores/quips  | `src/data/ticker.ts`          | when you want   |
| Your bio             | `src/config.ts` (DEFAULT_AUTHOR_BIO) | rarely  |

---

## Gotchas

- **Don't rename a file to start with `_`** unless you want it hidden. The
  `_TEMPLATE.md` files are hidden on purpose — copy them, don't edit them.
- **`draft: true` hides a post.** Set it to `false` to go live.
- **Only one post should have `lead: true`** at a time (the front-page headliner).
- **`git commit -am`**, not `git commit -a` (the latter opens a broken editor).
- **`git pull --rebase` before push** — the news bot commits between your pushes.
- The **YouTube ID** is just the code after `v=`, not the whole URL.
