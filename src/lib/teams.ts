/*
 * The seven covered teams. Drives routing (one interior page each), the score
 * ribbon, and the "Around the Teams" block. Tier controls prominence/depth
 * only — every team is always named, never bucketed. (See build checklist:
 * "Tier by prominence, name everything.")
 */

export type Tier = 'big4' | 'other';

export interface Team {
  id: string;    // route slug: /mariners
  name: string;  // "Mariners"
  abbr: string;  // "MRN" — ribbon / roundel label
  tier: Tier;
}

export const TEAMS: Team[] = [
  { id: 'mariners', name: 'Mariners', abbr: 'MRN', tier: 'big4' },
  { id: 'seahawks', name: 'Seahawks', abbr: 'SEA', tier: 'big4' },
  { id: 'kraken', name: 'Kraken', abbr: 'KRK', tier: 'big4' },
  { id: 'sonics', name: 'Sonics', abbr: 'SNC', tier: 'big4' }, // returning
  { id: 'sounders', name: 'Sounders', abbr: 'SOU', tier: 'other' },
  { id: 'storm', name: 'Storm', abbr: 'STM', tier: 'other' },
  { id: 'reign', name: 'Reign', abbr: 'RGN', tier: 'other' },
];
