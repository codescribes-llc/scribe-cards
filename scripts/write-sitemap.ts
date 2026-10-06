/**
 * Writes `dist/sitemap.xml` from the catalog and the notes on disk, so the file cannot
 * list a page that does not exist or miss one that does.
 *
 * It matters more than it looks. Until `write-route-pages.ts` gave every route a real
 * file, every route except `/` answered 404 and nothing but the homepage could be
 * indexed. With that fixed there are 35 indexable pages and no external links to most of
 * them, so a sitemap is how a crawler finds them at all.
 *
 * `SITE_URL` overrides the origin, for a fork or a staging host. `BASE_PATH` is read the
 * same way `vite.config.ts` reads it, so a deployment under a project path stays correct.
 */
import { readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import catalogJson from '../catalog.json' with { type: 'json' }
import type { Catalog } from '../src/types/cards'
import { renderSitemap, sitemapPaths, type SitemapNote } from '../src/utils/sitemap'

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)))
const origin = (process.env.SITE_URL ?? 'https://flashcards.codescribes.io').replace(/\/$/, '')
const base = process.env.BASE_PATH ?? '/'

/** The router identifies a note by domain and basename, which is all the path needs. */
function readNotes(): SitemapNote[] {
  const notesRoot = join(repoRoot, 'notes')
  const notes: SitemapNote[] = []

  for (const domainId of readdirSync(notesRoot)) {
    for (const file of readdirSync(join(notesRoot, domainId))) {
      // Only Markdown notes have a page; the example scripts are cited, never rendered.
      if (!file.endsWith('.md')) continue
      notes.push({ domainId, id: file.replace(/\.md$/, '') })
    }
  }

  return notes
}

const catalog = catalogJson as unknown as Catalog
const notes = readNotes()
const paths = sitemapPaths(catalog, notes)

// A sitemap with nothing in it is worse than none, and would mean the catalog failed to
// load rather than that the site has no pages.
if (paths.length < 4) {
  console.error(`✗ sitemap would contain only ${paths.length} URLs - refusing to write it`)
  process.exit(1)
}

const target = join(repoRoot, 'dist', 'sitemap.xml')
writeFileSync(target, renderSitemap(origin, base, paths))

console.log(
  `✓ wrote dist/sitemap.xml (${paths.length} URLs: ${catalog.courses.length} courses, ${notes.length} notes, at ${origin}${base === '/' ? '' : base})`,
)
