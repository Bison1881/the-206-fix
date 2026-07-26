/// <reference types="vite-react-ssg" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The moment this build ran. Baked into the bundle so the folio renders the
// SAME string during prerender and during hydration — see src/lib/edition.ts.
const BUILT_AT = new Date().toISOString();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILT_AT__: JSON.stringify(BUILT_AT),
  },
  // vite-react-ssg reads the routes and prerenders every static path to HTML.
  ssgOptions: {
    /*
     * MUST NOT be 'async'. vite-react-ssg writes
     * `window.__VITE_REACT_SSG_HASH__` in an inline script at the very END of
     * <body>, but puts the bundle tag in <head>. An async module executes the
     * instant it finishes downloading rather than waiting for the parser, so on
     * a warm cache the bundle could run before that global existed — it then
     * fetched `static-loader-data-manifest-undefined.json`, got Vercel's
     * plain-text 404, and threw "Unexpected token 'T' ... is not valid JSON"
     * onto the front page. Module scripts are deferred by default, so 'defer'
     * guarantees the inline hash script has already run. The race window scaled
     * with document size, which is why it hit the 23 KB front page and not the
     * 4 KB stubs.
     */
    script: 'defer',
  },
});
