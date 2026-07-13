/*
 * The seven covered teams. Drives routing (one interior page each), the score
 * ribbon, and the "Around the Teams" block. Tier controls prominence/depth
 * only — every team is always named, never bucketed. (See build checklist:
 * "Tier by prominence, name everything.")
 *
 * Phase 1 extends each entry with the fields the scoreboard needs: ESPN
 * sport/league slugs, the *resolved & verified* team id (see
 * scripts/resolve-espn-ids.mjs — never hand-guessed, spec §3), and the
 * live/returning kind. The whole scoreboard is driven from this array, so
 * adding a team later (a real Sonics, a future AUSL side) is a one-line change.
 */

export type Tier = 'big4' | 'other';

export type TeamKey =
  | 'mariners'
  | 'seahawks'
  | 'kraken'
  | 'sonics'
  | 'sounders'
  | 'storm'
  | 'reign';

export interface Team {
  id: TeamKey; // route slug: /mariners
  name: string; // "Mariners"
  abbr: string; // "MRN" — ribbon / roundel label (our own; ESPN abbreviates
  //               every Seattle club as "SEA", so it can't distinguish them)
  tier: Tier;

  // --- Phase 1 scoreboard fields ---
  sport: string; // ESPN sport slug: 'baseball' | 'soccer' | ...
  league: string; // ESPN league slug: 'mlb' | 'usa.1' | ...
  kind: 'live' | 'returning'; // 'returning' = no ESPN feed (Sonics), fixed tile
  espnTeamId?: string; // resolved + verified via scripts/resolve-espn-ids.mjs
  espnAbbr?: string; // captured provenance only — all Seattle clubs are "SEA"
  offseasonCopy?: string; // last-resort tile copy when no game is anywhere near
}

export const TEAMS: Team[] = [
  {
    id: 'mariners',
    name: 'Mariners',
    abbr: 'MRN',
    tier: 'big4',
    sport: 'baseball',
    league: 'mlb',
    kind: 'live',
    espnTeamId: '12',
    espnAbbr: 'SEA',
    offseasonCopy: 'MLB offseason',
  },
  {
    id: 'seahawks',
    name: 'Seahawks',
    abbr: 'SEA',
    tier: 'big4',
    sport: 'football',
    league: 'nfl',
    kind: 'live',
    espnTeamId: '26',
    espnAbbr: 'SEA',
    offseasonCopy: 'NFL offseason',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    abbr: 'KRK',
    tier: 'big4',
    sport: 'hockey',
    league: 'nhl',
    kind: 'live',
    espnTeamId: '124292',
    espnAbbr: 'SEA',
    offseasonCopy: 'NHL offseason',
  },
  {
    id: 'sonics',
    name: 'Sonics',
    abbr: 'SNC',
    tier: 'big4',
    sport: '',
    league: '',
    kind: 'returning', // no live feed — see §5; flip to 'live' + add ids when real
    offseasonCopy: 'EST. 1967 · RETURN WATCH',
  },
  {
    id: 'sounders',
    name: 'Sounders',
    abbr: 'SOU',
    tier: 'other',
    sport: 'soccer',
    league: 'usa.1',
    kind: 'live',
    espnTeamId: '9726',
    espnAbbr: 'SEA',
    offseasonCopy: 'MLS offseason',
  },
  {
    id: 'storm',
    name: 'Storm',
    abbr: 'STM',
    tier: 'other',
    sport: 'basketball',
    league: 'wnba',
    kind: 'live',
    espnTeamId: '14',
    espnAbbr: 'SEA',
    offseasonCopy: 'WNBA offseason',
  },
  {
    id: 'reign',
    name: 'Reign',
    abbr: 'RGN',
    tier: 'other',
    sport: 'soccer',
    league: 'usa.nwsl',
    kind: 'live',
    espnTeamId: '15363',
    espnAbbr: 'SEA',
    offseasonCopy: 'NWSL offseason',
  },
];
