/*
 * Typed access to the build-time aggregated feed data (src/data/feeds.json,
 * produced by scripts/fetch-feeds.mjs). Every surface — front-page wire,
 * per-team pages, community pulse — reads through
 * here and filters, so nothing fetches at runtime (spec §2, §5).
 */

import rawData from '../data/feeds.json';
import type { TeamKey } from './teams';

export interface WireItem {
  title: string;
  link: string;
  source: string;
  team: TeamKey | 'local';
  role: 'anchor' | 'depth';
  publishedAt: string;
  snippet?: string;
}

interface FeedData {
  generatedAt: string | null;
  wire: WireItem[];
}

const data = rawData as FeedData;

export const generatedAt = data.generatedAt;
export const wire: WireItem[] = data.wire ?? [];

/** Front-page wire: anchor items only, newest first (spec §5). */
export function anchorWire(limit?: number): WireItem[] {
  const items = wire.filter((w) => w.role === 'anchor');
  return limit ? items.slice(0, limit) : items;
}

/** A team's full set (anchor + depth), newest first — for its interior page. */
export function teamWire(team: TeamKey): WireItem[] {
  return wire.filter((w) => w.team === team);
}
