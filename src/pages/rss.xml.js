// src/pages/rss.xml.js
// Emits The 206 Fix's own RSS feed so readers can follow the channel's videos in
// any feed reader. This is distinct from the aggregated wire the site pulls in;
// this is OUR output going out. Each item links straight to the video on YouTube.

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { youtubeWatchUrl } from '../config';

export async function GET(context) {
  const videos = await getCollection('videos', ({ data }) => !data.draft);

  const items = videos
    .map((entry) => ({
      title: entry.data.title,
      description: entry.data.deck ?? '',
      pubDate: entry.data.publishDate,
      link: youtubeWatchUrl(entry.data.youtubeId),
      categories: ['Video', entry.data.game].filter(Boolean),
    }))
    .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: 'The 206 Fix',
    description:
      'Seattle sports and retro gaming, with a pixel heart. New videos from The 206 Fix — Seattle sports games on the NES and SNES.',
    site: context.site,
    items,
    customData: `<language>en-us</language>`,
  });
}
