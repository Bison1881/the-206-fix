/*
 * Guarantees src/data/feeds.json exists so dev / typecheck / build never fail
 * on the gitignored artifact. Writes an EMPTY shell only if the file is
 * missing — it never overwrites real data. The full network fetch is the
 * separate `feeds:fetch` (run by `prebuild` on real builds, or manually).
 */

import { writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUTPUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/feeds.json');

try {
  await access(OUTPUT_PATH);
  // Exists — leave whatever data is there untouched.
} catch {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  const empty = { generatedAt: null, wire: [], videos: [], log: { sourceCount: 0, ok: [], failed: [] } };
  await writeFile(OUTPUT_PATH, JSON.stringify(empty, null, 2), 'utf-8');
  console.log('[feeds] wrote empty src/data/feeds.json (run `npm run feeds:fetch` for real data)');
}
