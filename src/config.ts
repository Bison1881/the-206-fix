// src/config.ts
// Site-wide configuration constants. Single source of truth.

export const SITE_TITLE = 'The 206 Fix';
export const SITE_DESCRIPTION =
  'Seattle sports and retro gaming, with a pixel heart. Seattle sports games on the NES/SNES, played on The 206 Fix YouTube channel, plus the Seattle sports wire.';
export const YOUTUBE_URL = 'https://www.youtube.com/@the206fix';

// A video's watch URL on YouTube. Every video card and the site feed link here.
export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

// Default card image for a video: YouTube's hqdefault thumbnail (480x360),
// which always exists for a public video. A per-episode `customImage` overrides it.
export function youtubeThumb(youtubeId: string): string {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}
