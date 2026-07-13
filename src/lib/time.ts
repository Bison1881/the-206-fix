/*
 * Deterministic, timezone-stable formatting for build-time content. Feeds are
 * prerendered at build (Node) and hydrated in the browser (user's TZ); a
 * locale/TZ-dependent format would differ between the two and trigger a
 * hydration mismatch. Formatting from the ISO string via UTC getters yields
 * identical output in both places. (A few hours' UTC-vs-Pacific skew on a news
 * timestamp is an acceptable trade for hydration safety.)
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jul 13" — stable across server render and client hydration. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
