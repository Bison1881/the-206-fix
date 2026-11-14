import { useEffect } from 'react';
import { Head } from 'vite-react-ssg';

/*
 * Per-page <head>. Every route used to inherit index.html's single title and
 * description verbatim, so /mariners, /scores, /teams and the rest all shipped
 * as "The 206 Fix — Seattle Sports" with identical boilerplate underneath —
 * which threw away most of the per-route ranking the SSG stack was chosen for.
 *
 * Canonical is absolute and always points at the apex domain, so the www.
 * alias and the *.vercel.app preview hosts don't compete with production for
 * the same content.
 *
 * TWO mechanisms, on purpose:
 *
 *   <Head> (react-helmet-async, via vite-react-ssg) is what the prerender
 *   captures, so the static HTML a crawler receives is correct. That is the
 *   part that matters for search.
 *
 *   The effect below then owns the head in the browser. vite-react-ssg pins
 *   react-helmet-async 1.3.0, which is unmaintained and does not reliably
 *   re-apply on route change under React 18 — measured here, navigating
 *   /→/scores→/kraken left the tab title and canonical stuck on the front
 *   page's values while the page itself changed underneath. Setting them
 *   directly is deterministic and cheap, and it keeps working if that
 *   dependency is ever swapped out.
 *
 * Copy is functional metadata rather than editorial — rewrite freely.
 */

export const ORIGIN = 'https://the206fix.com';
const SITE = 'The 206 Fix';

interface Props {
  /** Page name. Omit on the front page, which uses the site title alone. */
  title?: string;
  description: string;
  /** Route path, leading slash. '/' for the front page. Omit when noindex. */
  path?: string;
  /** Keep the page out of the index — the 404, which has no canonical URL. */
  noindex?: boolean;
  /** A club page: names the team the page is about, for structured data. */
  aboutTeam?: string;
}

const IMAGE = `${ORIGIN}/og-image.png`;
const IMAGE_ALT = 'The 206 Fix, Seattle Sports';

/** JSON-LD for a page: the site itself on the front page, a breadcrumb trail elsewhere. */
function structuredData(fullTitle: string, title: string | undefined, description: string, canonical: string, aboutTeam?: string) {
  if (!title) {
    return [
      { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, alternateName: fullTitle, url: ORIGIN },
      { '@context': 'https://schema.org', '@type': 'Organization', name: SITE, url: ORIGIN, logo: `${ORIGIN}/apple-touch-icon.png` },
    ];
  }
  const out: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE, item: ORIGIN },
        { '@type': 'ListItem', position: 2, name: title, item: canonical },
      ],
    },
  ];
  if (aboutTeam) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: fullTitle,
      description,
      url: canonical,
      isPartOf: { '@type': 'WebSite', name: SITE, url: ORIGIN },
      about: { '@type': 'SportsTeam', name: aboutTeam },
    });
  }
  return out;
}

/** Upsert a <meta name="..."> in <head>, or drop it when content is null. */
function setMeta(name: string, content: string | null) {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (content === null) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.content = content;
    return;
  }
  const el = document.createElement('meta');
  el.name = name;
  el.content = content;
  document.head.appendChild(el);
}

/** Upsert <link rel="canonical">, or drop it when href is null. */
function setCanonical(href: string | null) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    existing?.remove();
    return;
  }
  if (existing) {
    existing.href = href;
    return;
  }
  const el = document.createElement('link');
  el.rel = 'canonical';
  el.href = href;
  document.head.appendChild(el);
}

export default function PageMeta({ title, description, path, noindex, aboutTeam }: Props) {
  const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — Seattle Sports`;
  const canonical = path === '/' ? ORIGIN : `${ORIGIN}${path}`;
  // "<" escaped so a stray "</script>" in a title could never end the block early.
  const ld = noindex ? [] : structuredData(fullTitle, title, description, canonical, aboutTeam).map((d) => JSON.stringify(d).replace(/</g, '\\u003c'));

  useEffect(() => {
    document.title = fullTitle;
    setMeta('description', description);
    // A page is either indexable with a canonical, or noindex with none.
    setMeta('robots', noindex ? 'noindex, follow' : null);
    setCanonical(noindex ? null : canonical);
  }, [fullTitle, description, canonical, noindex]);

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex ? (
        <meta name="robots" content="noindex, follow" />
      ) : (
        <link rel="canonical" href={canonical} />
      )}
      {!noindex && <meta property="og:type" content="website" />}
      {!noindex && <meta property="og:site_name" content={SITE} />}
      {!noindex && <meta property="og:title" content={fullTitle} />}
      {!noindex && <meta property="og:description" content={description} />}
      {!noindex && <meta property="og:url" content={canonical} />}
      {!noindex && <meta property="og:image" content={IMAGE} />}
      {!noindex && <meta property="og:image:width" content="1200" />}
      {!noindex && <meta property="og:image:height" content="630" />}
      {!noindex && <meta property="og:image:alt" content={IMAGE_ALT} />}
      {!noindex && <meta name="twitter:card" content="summary_large_image" />}
      {!noindex && <meta name="twitter:title" content={fullTitle} />}
      {!noindex && <meta name="twitter:description" content={description} />}
      {!noindex && <meta name="twitter:image" content={IMAGE} />}
      {ld.map((json, i) => (
        <script key={i} type="application/ld+json">
          {json}
        </script>
      ))}
    </Head>
  );
}
