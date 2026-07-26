/*
 * Vercel Cron target — the scheduler that keeps the wire fresh.
 *
 * The site is fully static: the feed aggregation runs at build (prebuild →
 * feeds:fetch), so "refreshing the feeds" means "trigger a rebuild". This
 * endpoint does nothing but POST the project's Deploy Hook. It replaces the
 * GitHub Actions workflow that used to do the same POST on a schedule.
 *
 * Why the move: GitHub's free scheduler is best-effort and drifts badly under
 * load. Measured over three days it ran 1–3.5 hours late every time, and on
 * 2026-07-26 the 13:00 UTC run never fired at all, leaving the front page
 * serving the previous evening's news at midday Seattle time. Vercel Cron runs
 * on time.
 *
 * Requires two environment variables on the Vercel project (Production):
 *   CRON_SECRET            — Vercel sends this as `Authorization: Bearer …` on
 *                            every cron invocation. Without it this endpoint
 *                            refuses everything, so it MUST be set or the wire
 *                            silently stops updating.
 *   VERCEL_DEPLOY_HOOK_URL — the existing refresh-feeds Deploy Hook. Same value
 *                            already held as a GitHub Actions secret.
 *
 * Deliberately fails closed on auth (the URL is public) but loudly on config:
 * a missing hook returns 503 with a readable reason rather than a silent 200,
 * because a scheduler that reports success while doing nothing is the exact
 * failure this replaces.
 */

export async function GET(request: Request): Promise<Response> {
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return json(401, { ok: false, error: 'Unauthorized' });
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    console.error('[refresh-feeds] VERCEL_DEPLOY_HOOK_URL is not set — cannot trigger a rebuild.');
    return json(503, { ok: false, error: 'VERCEL_DEPLOY_HOOK_URL is not set' });
  }

  try {
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) {
      console.error(`[refresh-feeds] deploy hook returned ${res.status}`);
      return json(502, { ok: false, error: `Deploy hook returned ${res.status}` });
    }
    console.log('[refresh-feeds] rebuild triggered.');
    return json(200, { ok: true, triggered: true });
  } catch (err) {
    console.error('[refresh-feeds] deploy hook request failed:', err);
    return json(502, { ok: false, error: 'Deploy hook request failed' });
  }
}
