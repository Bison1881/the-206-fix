// src/config.ts
// Site-wide configuration constants. Single source of truth.

// The default byline for original writing. Currently a handle while the
// site stays anonymous; swap this one value to a real name later and every
// page that uses the default updates automatically.
export const DEFAULT_AUTHOR = 'Two Oh Six';

// URL-safe version of the author name, used for the /author/<slug> page.
// If you change DEFAULT_AUTHOR, update this to match (lowercase, dashes).
export const DEFAULT_AUTHOR_SLUG = 'two-oh-six';

// Short bio shown at the top of the author page. Edit freely, or leave blank.
export const DEFAULT_AUTHOR_BIO =
  'The byline behind The 206 Fix. Seattle sports the long way around, plus the games we grew up on. The name comes later; the writing comes first.';

export const SITE_TITLE = 'The 206 Fix';
export const SITE_DESCRIPTION =
  'Seattle sports and retro gaming, with a pixel heart. Original columns and retro coverage from The 206 Fix.';
export const YOUTUBE_URL = 'https://www.youtube.com/@the206fix';

// Build the link to an author's page from their display name.
export function authorHref(name: string): string {
  const slug = (name || DEFAULT_AUTHOR)
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `/author/${slug}`;
}
