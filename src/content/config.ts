import { defineCollection, z } from 'astro:content';

// The site's only content collection: the owner's YouTube videos. Each entry is
// one episode. Videos link straight to YouTube — there are no on-site video
// pages — so the slug is only used as a stable key.
const videos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    // One-line blurb shown on the card. Optional.
    deck: z.string().optional(),
    publishDate: z.coerce.date(),
    episodeNumber: z.number().optional(),
    // Required: every entry is a real video. Drives the thumbnail + watch link.
    youtubeId: z.string(),
    game: z.string().optional(),
    series: z.string().optional(),
    // Optional per-episode image override (e.g. a game screenshot). When absent,
    // the card falls back to the YouTube thumbnail, so a new episode needs zero
    // manual image work.
    customImage: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  videos,
};
