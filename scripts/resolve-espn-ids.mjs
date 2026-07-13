/*
 * Phase 1 · ESPN team-ID resolver (dev-time, run once, results committed).
 *
 * Stale hardcoded IDs are a silent-failure trap (spec §3), so we never guess
 * them. For each live team we hit the league `.../teams` endpoint, match the
 * Seattle club by name, then VERIFY the match by re-fetching the team-info
 * endpoint for the resolved id. Everything is logged so it's auditable.
 *
 * Usage:  node scripts/resolve-espn-ids.mjs
 * Output: a table + a ready-to-paste snippet of { espnTeamId, espnAbbr } per
 *         team. Eyeball the log, then hand-copy the verified ids into
 *         src/lib/teams.ts. Sonics is kind:'returning' (no feed) and skipped.
 */

const SITE = 'https://site.api.espn.com/apis/site/v2/sports';

// One entry per LIVE team. `match` finds the Seattle club in the league list;
// `expect` is asserted against the resolved team so a bad match is loud.
const TEAMS = [
  { key: 'mariners', sport: 'baseball',   league: 'mlb',      match: /seattle mariners/i,  expect: /mariners/i },
  { key: 'seahawks', sport: 'football',   league: 'nfl',      match: /seattle seahawks/i,  expect: /seahawks/i },
  { key: 'kraken',   sport: 'hockey',     league: 'nhl',      match: /seattle kraken/i,    expect: /kraken/i },
  { key: 'storm',    sport: 'basketball', league: 'wnba',     match: /seattle storm/i,     expect: /storm/i },
  { key: 'sounders', sport: 'soccer',     league: 'usa.1',    match: /seattle sounders/i,  expect: /sounders/i },
  { key: 'reign',    sport: 'soccer',     league: 'usa.nwsl', match: /seattle reign|seattle/i, expect: /reign|seattle/i },
];

const TIMEOUT_MS = 12000;

async function getJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// The `.../teams` payload nests the list under sports[].leagues[].teams[].
function extractTeams(payload) {
  const league = payload?.sports?.[0]?.leagues?.[0];
  return (league?.teams ?? []).map((t) => t.team).filter(Boolean);
}

async function resolveOne(cfg) {
  const listUrl = `${SITE}/${cfg.sport}/${cfg.league}/teams`;
  const list = extractTeams(await getJson(listUrl));
  if (!list.length) throw new Error(`no teams returned from ${listUrl}`);

  const hit = list.find((t) =>
    cfg.match.test(t.displayName ?? '') ||
    cfg.match.test(`${t.location ?? ''} ${t.name ?? ''}`.trim())
  );
  if (!hit) throw new Error(`no team matched ${cfg.match} in ${cfg.league}`);

  // Verify: re-fetch the team-info endpoint by id and confirm it's the club we
  // expect. A wrong id that still returns *a* team is the failure we guard against.
  const infoUrl = `${SITE}/${cfg.sport}/${cfg.league}/teams/${hit.id}`;
  const info = await getJson(infoUrl);
  const verified = info?.team;
  const verifiedName = verified?.displayName ?? '';
  const ok = cfg.expect.test(verifiedName);

  return {
    key: cfg.key,
    id: hit.id,
    abbr: hit.abbreviation ?? '',
    displayName: hit.displayName ?? '',
    verifiedName,
    verified: ok,
  };
}

const results = [];
for (const cfg of TEAMS) {
  process.stdout.write(`Resolving ${cfg.key.padEnd(9)} (${cfg.sport}/${cfg.league}) … `);
  try {
    const r = await resolveOne(cfg);
    results.push(r);
    console.log(
      `${r.verified ? 'OK ' : 'MISMATCH!'} id=${r.id} abbr=${r.abbr} ` +
      `"${r.displayName}" (verify→"${r.verifiedName}")`
    );
  } catch (err) {
    results.push({ key: cfg.key, error: String(err?.message ?? err) });
    console.log(`FAILED — ${err?.message ?? err}`);
  }
}

console.log('\n─── Resolved (paste verified ids into src/lib/teams.ts) ───\n');
for (const r of results) {
  if (r.error) {
    console.log(`  ${r.key}: ERROR — ${r.error}`);
  } else {
    const flag = r.verified ? '' : '   // ⚠ VERIFY MANUALLY — mismatch';
    console.log(`  ${r.key}: espnTeamId: '${r.id}', espnAbbr: '${r.abbr}',${flag}`);
  }
}

const bad = results.filter((r) => r.error || r.verified === false);
if (bad.length) {
  console.log(`\n⚠  ${bad.length} team(s) need manual review before wiring in.`);
  process.exitCode = 1;
} else {
  console.log('\n✓ All teams resolved and verified.');
}
