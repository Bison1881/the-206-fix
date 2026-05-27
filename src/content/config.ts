import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    deck: z.string().optional(),
    author: z.string().default('Mike Thunder'),
    publishDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tag: z.enum([
      'Long View',
      'Faith & Sports',
      'Retro History',
      'Sonics Watch',
      'Seahawks',
      'Mariners',
      'Kraken',
      'Sounders',
      'Column',
      'Essay',
    ]),
    team: z.enum(['seahawks', 'mariners', 'kraken', 'sounders', 'sonics', 'general']).default('general'),
    featured: z.boolean().default(false),
    lead: z.boolean().default(false),
    readMinutes: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

const retro = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    deck: z.string().optional(),
    author: z.string().default('Mike Thunder'),
    publishDate: z.coerce.date(),
    episodeNumber: z.number().optional(),
    youtubeId: z.string().optional(),
    game: z.string(),
    series: z.string().optional(),
    featured: z.boolean().default(false),
    readMinutes: z.number().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  articles,
  retro,
};
