// src/pages/rss.xml.js
// Emits The 206 Fix's own RSS feed so readers can follow original writing
// (columns + retro pieces) in any feed reader. This is distinct from the
// aggregated wire feeds the site pulls in; this is OUR output going out.

import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
  const articles = await getCollection('articles', ({ data }) => !data.draft);
  const retro = await getCollection('retro', ({ data }) => !data.draft);

  const articleItems = articles.map((entry) => ({
    title: entry.data.title,
    description: entry.data.deck ?? '',
    pubDate: entry.data.publishDate,
    link: `/articles/${entry.slug}/`,
    author: entry.data.author,
    categories: [entry.data.tag],
  }));

  const retroItems = retro.map((entry) => ({
    title: entry.data.title,
    description: entry.data.deck ?? '',
    pubDate: entry.data.publishDate,
    link: `/retro/${entry.slug}/`,
    author: entry.data.author,
    categories: ['Retro', entry.data.game].filter(Boolean),
  }));

  const items = [...articleItems, ...retroItems].sort(
    (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()
  );

  return rss({
    title: 'The 206 Fix',
    description:
      'Seattle sports and retro gaming, with a pixel heart. Original columns and retro coverage from The 206 Fix.',
    site: context.site,
    items,
    customData: `<language>en-us</language>`,
  });
}
