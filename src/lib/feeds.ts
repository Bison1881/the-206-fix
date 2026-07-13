/*
 * Typed access to the build-time aggregated feed data (src/data/feeds.json,
 * produced by scripts/fetch-feeds.mjs). Every surface — front-page wire,
 * Around the Teams, per-team pages, Film Room, community pulse — reads through
 * here and filters, so nothing fetches at runtime (spec §2, §5).
 */

import rawData from '../data/feeds.json';
import { TEAMS, type TeamKey } from './teams';

export interface WireItem {
  title: string;
  link: string;
  source: string;
  team: TeamKey | 'local';
  role: 'anchor' | 'depth';
  publishedAt: string;
  snippet?: string;
}

export interface VideoItem {
  title: string;
  link: string;
  videoId: string;
  publishedAt: string;
  thumbnail: string;
}

export interface CommunityItem {
  title: string;
  link: string;
  subreddit: string;
  publishedAt: string;
}

interface FeedData {
  generatedAt: string | null;
  wire: WireItem[];
  videos: VideoItem[];
  community: CommunityItem[];
}

const data = rawData as FeedData;

export const generatedAt = data.generatedAt;
export const wire: WireItem[] = data.wire ?? [];
export const videos: VideoItem[] = data.videos ?? [];
export const community: CommunityItem[] = data.community ?? [];

/** Front-page wire: anchor items only, newest first (spec §5). */
export function anchorWire(limit?: number): WireItem[] {
  const items = wire.filter((w) => w.role === 'anchor');
  return limit ? items.slice(0, limit) : items;
}

/** A team's full set (anchor + depth), newest first — for its interior page. */
export function teamWire(team: TeamKey): WireItem[] {
  return wire.filter((w) => w.team === team);
}

/**
 * Around the Teams: the latest anchor headline per team, in TEAMS order, all
 * seven always named (item is undefined if that team currently has nothing).
 */
export function aroundTheTeams(): { team: TeamKey; name: string; item?: WireItem }[] {
  return TEAMS.map((t) => ({
    team: t.id,
    name: t.name,
    item: wire.find((w) => w.team === t.id && w.role === 'anchor'),
  }));
}
